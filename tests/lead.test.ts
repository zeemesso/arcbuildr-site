import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/lib/env";
import { FAILURE_MESSAGE, handleLead, parseLead } from "../src/lib/lead";

const env = {
  NOTION_TOKEN: "ntn_test",
  NOTION_DATABASE_ID: "db123",
  RESEND_API_KEY: "re_test",
  ALERT_EMAIL: "alerts@example.com",
} as Env;

const valid = {
  name: "Hanane",
  email: "hanane@example.com",
  instagram: "hanane",
  business: "Coaching studio",
  goal: "Be known.",
  src: "ig",
  referrer: "",
  sent_at: "2026-10-25T10:00:00.000Z",
  website: "",
};

function post(fields: Record<string, string>, json = true) {
  return new Request("https://x.test/api/lead", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(json ? { Accept: "application/json" } : {}),
    },
    body: new URLSearchParams(fields),
  });
}

let calls: { url: string; body: any }[];
function stubFetch(notion: Response | "throw", resend: Response | "throw") {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(init.body as string) });
      const answer = url.includes("notion") ? notion : resend;
      if (answer === "throw") throw new Error("down");
      return answer.clone();
    }),
  );
}
const notionOk = () => Response.json({ id: "page-1" });
const resendOk = () => Response.json({ id: "mail-1" });

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/lead", () => {
  it("valid: writes to Notion, sends the alert, answers ok", async () => {
    stubFetch(notionOk(), resendOk());
    const res = await handleLead(post(valid), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls.map((c) => c.url)).toEqual([
      "https://api.notion.com/v1/pages",
      "https://api.resend.com/emails",
    ]);
    const props = calls[0]!.body.properties;
    expect(props.Instagram.rich_text[0].text.content).toBe("@hanane");
    expect(props.Source.select.name).toBe("ig");
    expect(props.Status.select.name).toBe("New");
    expect(calls[1]!.body.text).toContain("Notion row: page-1");
  });

  it("valid, no JavaScript: 303 to /thanks with name and email", async () => {
    stubFetch(notionOk(), resendOk());
    const res = await handleLead(post(valid, false), env);
    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toBe("/thanks?name=Hanane&email=hanane%40example.com");
  });

  it("invalid: 400 with field errors and no outside call", async () => {
    stubFetch(notionOk(), resendOk());
    const res = await handleLead(post({ ...valid, email: "hanane@gmail", name: "" }), env);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { errors: Record<string, string> };
    expect(Object.keys(body.errors).sort()).toEqual(["email", "name"]);
    expect(calls).toEqual([]);
  });

  it("spam trap: looks like success, stores nothing", async () => {
    stubFetch(notionOk(), resendOk());
    const res = await handleLead(post({ ...valid, website: "http://spam.test" }), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls).toEqual([]);
  });

  it("Notion down: failure state, no redirect, no alert", async () => {
    stubFetch(new Response("{}", { status: 500 }), resendOk());
    const res = await handleLead(post(valid), env);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: FAILURE_MESSAGE });
    expect(calls.map((c) => c.url)).toEqual(["https://api.notion.com/v1/pages"]);
    const html = await handleLead(post(valid, false), env);
    expect(html.status).toBe(502);
    expect(html.headers.get("Location")).toBeNull();
  });

  it("Notion request throws: same failure state", async () => {
    stubFetch("throw", resendOk());
    expect((await handleLead(post(valid), env)).status).toBe(502);
  });

  it("Resend down: still ok, the lead is in Notion", async () => {
    stubFetch(notionOk(), new Response("{}", { status: 500 }));
    const res = await handleLead(post(valid), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });

  it("Resend request throws: still ok", async () => {
    stubFetch(notionOk(), "throw");
    expect((await handleLead(post(valid), env)).status).toBe(200);
  });
});

describe("parseLead", () => {
  function toForm(o: Record<string, string>) {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  }

  it("unknown src becomes direct; handle gets one @; bad date uses now", () => {
    const r = parseLead(
      toForm({ ...valid, src: "evil", instagram: "@@ han ane", sent_at: "nope" }),
      new Date("2026-10-25T12:00:00Z"),
    );
    expect(r.ok && r.lead.source).toBe("direct");
    expect(r.ok && r.lead.instagram).toBe("@hanane");
    expect(r.ok && r.lead.submittedAt).toBe("2026-10-25T12:00:00.000Z");
  });
});
