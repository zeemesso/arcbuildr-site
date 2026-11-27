import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/lib/env";
import { PLAN_API_PATH } from "../src/lib/magnet/contract";
import { handlePlan } from "../src/lib/magnet/plan";
import { escapeHtml, renderMarkdown } from "../src/lib/magnet/render";
import { claimLead, finishLead, insertLead, saveScreen, type Sql } from "../src/lib/magnet/store";
import { PLAN_TEXT, splitMessage } from "../src/lib/magnet/text";
import * as registry from "../src/magnets/registry";
import { testSample } from "../src/magnets/test-sample";
import worker from "../src/worker";
import { magnetEnv, submit, validForm } from "./helpers/magnet-fixtures";

/** The Worker's fetch takes a context; these routes never use it. */
const ctx = { waitUntil() {} } as unknown as ExecutionContext;

const now = new Date("2026-11-27T10:00:00.000Z");
const TOKEN = "tokentokentokentoken12";
const queued = { status: "queued", attempts: 0 } as const;

const planRequest = (authorization?: string) =>
  new Request(`https://x.test${PLAN_API_PATH}`, {
    headers: authorization ? { Authorization: authorization } : {},
  });

describe("splitMessage", () => {
  it("makes the first sentence of each plan message the headline", () => {
    for (const message of [PLAN_TEXT.badLink, PLAN_TEXT.rejected, PLAN_TEXT.held]) {
      const { heading, body } = splitMessage(message);
      expect(heading.endsWith(".")).toBe(true);
      expect(body).not.toBe("");
      expect(`${heading} ${body}`).toBe(message);
    }
  });

  it("keeps a one-sentence message whole", () => {
    expect(splitMessage("This link doesn't open anything.")).toEqual({
      heading: "This link doesn't open anything.",
      body: "",
    });
  });
});

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
    const res = await handlePlan(planRequest(`Bearer ${token}`), env);
    return { status: res.status, body: await res.json(), cache: res.headers.get("cache-control") };
  };

  it("reports the saved job step through claim, screening and a queued retry", async () => {
    const working = { status: "working", step: "queued", wait: null };
    expect(await state()).toEqual({ status: 200, body: working, cache: "no-store" });
    await claimLead(db, { id: "lead-1", ...queued }, now);
    expect((await state()).body).toEqual({ ...working, step: "reading" });
    await saveScreen(db, "lead-1", 1, { score: 3, reason: "TEST", setterNote: "TEST" });
    expect((await state()).body).toEqual({ ...working, step: "writing" });
    await finishLead(db, "lead-1", { status: "running", attempts: 1 }, { status: "queued" }, now);
    expect((await state()).body).toEqual(working);
  });

  it("includes the public video for this magnet", async () => {
    const wait = { title: "TEST video", src: "/wait.mp4", poster: "/poster.jpg" };
    const magnet = vi
      .spyOn(registry, "getMagnet")
      .mockReturnValue({ ...testSample, waitVideo: wait });
    try {
      expect((await state()).body).toEqual({ status: "working", step: "queued", wait });
      expect(magnet).toHaveBeenCalledWith(lead.magnet);
    } finally {
      magnet.mockRestore();
    }
  });

  it("returns the rendered deliverable when it is done, and nothing else about the lead", async () => {
    await finishLead(
      db,
      "lead-1",
      queued,
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
    await finishLead(db, "lead-1", queued, { status: "rejected", error: "Gibberish." }, now);
    expect((await state()).body).toEqual({
      status: "unavailable",
      message:
        "We read your answers and did not write anything. We only write when the answers give us enough to work with. Think we got it wrong? DM us at @arcbuildr.",
    });
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
    expect(await state()).toEqual({
      status: 503,
      body: { status: "working", step: "queued", wait: null },
      cache: "no-store",
    });
  });

  it("keeps the page waiting when the lookup fails", async () => {
    vi.spyOn(db, "prepare").mockImplementationOnce(() => {
      throw new Error("lookup failed");
    });
    expect(await state()).toEqual({
      status: 503,
      body: { status: "working", step: "queued", wait: null },
      cache: "no-store",
    });
  });

  it("TEST requires the Bearer header even when the token is in the query", async () => {
    const requests = [
      planRequest(),
      planRequest(`Basic ${TOKEN}`),
      new Request(`https://x.test${PLAN_API_PATH}?token=${TOKEN}`),
    ];
    for (const request of requests) {
      const response = await handlePlan(request, env);
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });
});

describe("worker routes", () => {
  it("routes the form post and the plan lookup, and 404s the rest of /api/magnet", async () => {
    const { env } = magnetEnv();
    const posted = await worker.fetch(submit(validForm()) as never, env, ctx);
    expect(posted.status).toBe(200);
    const { url } = (await posted.json()) as { url: string };
    const token = url.split("#")[1]!;
    const plan = await worker.fetch(planRequest(`Bearer ${token}`) as never, env, ctx);
    expect(await plan.json()).toEqual({ status: "working", step: "queued", wait: null });
    const old = await worker.fetch(
      new Request(`https://x.test${PLAN_API_PATH}/${token}`) as never,
      env,
      ctx,
    );
    expect(old.status).toBe(404);
    expect(old.headers.get("cache-control")).toBe("no-store");
    expect(await old.text()).toBe("Not found");
    const wrongMethod = await worker.fetch(
      new Request("https://x.test/api/magnet/test-sample") as never,
      env,
      ctx,
    );
    expect(wrongMethod.status).toBe(404);
    const deep = await worker.fetch(
      new Request("https://x.test/api/magnet/plan/a/b") as never,
      env,
      ctx,
    );
    expect(deep.status).toBe(404);
  });
});
