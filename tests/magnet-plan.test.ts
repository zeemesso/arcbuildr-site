import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/lib/env";
import { handlePlan } from "../src/lib/magnet/plan";
import { escapeHtml, renderMarkdown } from "../src/lib/magnet/render";
import { claimLead, finishLead, insertLead, type Sql } from "../src/lib/magnet/store";
import { PLAN_TEXT } from "../src/lib/magnet/text";
import worker from "../src/worker";
import { magnetEnv, submit, validForm } from "./helpers/magnet-fixtures";

const now = new Date("2026-11-27T10:00:00.000Z");
const TOKEN = "tokentokentokentoken12";

describe("renderMarkdown", () => {
  it("renders the supported marks", () => {
    const html = renderMarkdown(
      [
        "## Where you are",
        "Hanane, you **coach** dentists",
        "and post *now and then*.",
        "",
        "### Next",
        "- One",
        "- Two",
        "  still two",
        "",
        "1. First",
        "2) Second",
        "",
        "> I never know",
        "> what to post.",
        "",
        "---",
        "# Top level",
      ].join("\n"),
    );
    expect(html).toBe(
      [
        "<h2>Where you are</h2>",
        "<p>Hanane, you <strong>coach</strong> dentists and post <em>now and then</em>.</p>",
        "<h3>Next</h3>",
        "<ul><li>One</li><li>Two still two</li></ul>",
        "<ol><li>First</li><li>Second</li></ol>",
        "<blockquote><p>I never know what to post.</p></blockquote>",
        "<hr>",
        "<h2>Top level</h2>",
      ].join("\n"),
    );
  });

  it("escapes every piece of markup, wherever it sits", () => {
    const hostile = [
      '## <img src=x onerror="alert(1)">',
      "<script>alert(1)</script>",
      "- <a href='javascript:alert(1)'>x</a>",
      "> </blockquote><iframe src=//evil>",
      "[click](javascript:alert(1)) ![i](http://evil/x.png)",
      "**<b onmouseover=alert(1)>bold</b>**",
      "<!-- comment --> &lt;already&gt;",
    ].join("\n");
    const html = renderMarkdown(hostile);
    // Only tags this renderer writes may appear.
    const tags = html.match(/<\/?[a-z0-9]+[^>]*>/gi) ?? [];
    for (const tag of tags)
      expect(tag).toMatch(/^<\/?(h2|h3|p|ul|ol|li|strong|em|blockquote|hr)>$/);
    expect(html).not.toMatch(/<(script|img|a|iframe|b)\b/i);
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&amp;lt;already&amp;gt;");
    expect(html).toContain("[click](javascript:alert(1))");
  });

  it("leaves stray stars and empty input alone", () => {
    expect(renderMarkdown("2 * 3 * 4 and a**b")).toBe("<p>2 * 3 * 4 and a**b</p>");
    expect(renderMarkdown("  \n\n")).toBe("");
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});

describe("handlePlan", () => {
  let env: Env;
  let db: Sql;
  const lead = {
    id: "lead-1",
    token: TOKEN,
    magnet: "test-sample",
    createdAt: now.toISOString(),
    name: "TEST Hanane Idrissi",
    email: "hanane@example.com",
    instagram: "@hanane",
    phone: "",
    answers: { business: "Coaching" },
    page: "",
    utm: "",
    rr: "",
    tz: "",
    unsub: "unsubunsubunsubunsub12",
  };
  beforeEach(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    ({ env, db } = magnetEnv());
    await insertLead(db, lead);
  });
  const state = async (token = TOKEN) => {
    const res = await handlePlan(env, token);
    return { status: res.status, body: await res.json(), cache: res.headers.get("cache-control") };
  };

  it("says working while the lead is queued or running", async () => {
    expect(await state()).toEqual({ status: 200, body: { status: "working" }, cache: "no-store" });
    await claimLead(db, "lead-1", now);
    expect((await state()).body).toEqual({ status: "working" });
  });

  it("returns the rendered deliverable when it is done, and nothing else about the lead", async () => {
    await finishLead(
      db,
      "lead-1",
      { status: "done", deliverable: "## Plan\n<script>x</script>" },
      now,
    );
    const { body } = await state();
    expect(body).toEqual({
      status: "ready",
      title: "Your sample plan",
      name: "TEST",
      html: "<h2>Plan</h2>\n<p>&lt;script&gt;x&lt;/script&gt;</p>",
    });
    expect(JSON.stringify(body)).not.toContain("hanane@example.com");
  });

  it("gives a plain message for a rejected, held or failed lead", async () => {
    await finishLead(db, "lead-1", { status: "rejected", error: "Gibberish." }, now);
    expect((await state()).body).toEqual({ status: "unavailable", message: PLAN_TEXT.rejected });
    await db.prepare("UPDATE magnet_leads SET status = 'held' WHERE id = 'lead-1'").run();
    expect((await state()).body).toEqual({ status: "unavailable", message: PLAN_TEXT.held });
    await db.prepare("UPDATE magnet_leads SET status = 'failed' WHERE id = 'lead-1'").run();
    expect((await state()).body).toEqual({ status: "unavailable", message: PLAN_TEXT.held });
  });

  it("answers an unknown or malformed token the same way", async () => {
    const unknown = await state("othertokenothertoken12");
    const malformed = await state("short");
    expect(unknown).toEqual({
      status: 404,
      body: { status: "unavailable", message: PLAN_TEXT.badLink },
      cache: "no-store",
    });
    expect(malformed).toEqual(unknown);
  });

  it("keeps the page waiting when the database is missing", async () => {
    env = magnetEnv({ DB: undefined }).env;
    expect(await state()).toMatchObject({ status: 503, body: { status: "working" } });
  });
});

describe("worker routes", () => {
  it("routes the form post and the plan lookup, and 404s the rest of /api/magnet", async () => {
    const { env } = magnetEnv();
    const posted = await worker.fetch(submit(validForm()) as never, env);
    expect(posted.status).toBe(200);
    const { url } = (await posted.json()) as { url: string };
    const token = url.split("#")[1]!;
    const plan = await worker.fetch(
      new Request(`https://x.test/api/magnet/plan/${token}`) as never,
      env,
    );
    expect(await plan.json()).toEqual({ status: "working" });
    const wrongMethod = await worker.fetch(
      new Request("https://x.test/api/magnet/test-sample") as never,
      env,
    );
    expect(wrongMethod.status).toBe(404);
    const deep = await worker.fetch(
      new Request("https://x.test/api/magnet/plan/a/b") as never,
      env,
    );
    expect(deep.status).toBe(404);
  });
});
