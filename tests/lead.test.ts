import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/lib/env";
import { FAILURE_MESSAGE, handleLead, parseLead } from "../src/lib/lead";

const SHEETS_URL = "https://script.google.com/macros/s/test/exec";
const env = {
  SHEETS_URL,
  SHEETS_TOKEN: "sheet-secret",
  RESEND_API_KEY: "re_test",
  ALERT_EMAIL: "alerts@example.com",
} as Env;

const valid = {
  name: "TEST Hanane",
  email: "hanane@example.com",
  phone: "+212 6 12 34 56 78",
  instagram: "hanane",
  language: "Darija",
  channel: "WhatsApp",
  budget: "Not sure yet",
  decision: "Alone",
  need: "More clients",
  timing: "This month",
  heard: "Instagram",
  referred_by: "",
  tz: "Africa/Casablanca",
  page: "https://arcbuildr.co/?utm_source=ig",
  utm: "utm_source=ig",
  sent_at: "2026-11-08T10:00:00.000Z",
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
function stubFetch(sheets: Response | "throw", resend: Response | "throw") {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(init.body as string) });
      const answer = url === SHEETS_URL ? sheets : resend;
      if (answer === "throw") throw new Error("down");
      return answer.clone();
    }),
  );
}
const sheetsOk = () => Response.json({ ok: true });
const resendOk = () => Response.json({ id: "mail-1" });

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/lead", () => {
  it("valid: appends to the sheet with the token, sends the alert, answers ok", async () => {
    stubFetch(sheetsOk(), resendOk());
    const res = await handleLead(post(valid), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls.map((c) => c.url)).toEqual([SHEETS_URL, "https://api.resend.com/emails"]);
    const { token, lead } = calls[0]!.body;
    expect(token).toBe("sheet-secret");
    expect(lead).toEqual({
      timestamp: "2026-11-08T10:00:00.000Z",
      name: "TEST Hanane",
      email: "hanane@example.com",
      phone: "+212612345678",
      instagram: "@hanane",
      language: "Darija",
      channel: "WhatsApp",
      budget: "Not sure yet",
      decisionMaker: "Alone",
      need: "More clients",
      timing: "This month",
      heardAbout: "Instagram",
      referredBy: "",
      timeZone: "Africa/Casablanca",
      sourcePage: "https://arcbuildr.co/?utm_source=ig",
      utm: "utm_source=ig",
    });
    expect(calls[1]!.body.text).toContain("Phone: +212612345678");
  });

  it("valid, no JavaScript: 303 to /thanks with name and email", async () => {
    stubFetch(sheetsOk(), resendOk());
    const res = await handleLead(post(valid, false), env);
    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toBe("/thanks?name=TEST+Hanane&email=hanane%40example.com");
  });

  it("invalid: 400 with field errors and no outside call", async () => {
    stubFetch(sheetsOk(), resendOk());
    const res = await handleLead(
      post({ ...valid, email: "hanane@gmail", phone: "0612345678", budget: "a million" }),
      env,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { errors: Record<string, string> };
    expect(Object.keys(body.errors).sort()).toEqual(["budget", "email", "phone"]);
    expect(calls).toEqual([]);
  });

  it("spam trap: looks like success, stores nothing", async () => {
    stubFetch(sheetsOk(), resendOk());
    const res = await handleLead(post({ ...valid, website: "http://spam.test" }), env);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls).toEqual([]);
  });

  it("sheet refuses (bad token): failure state, no redirect, no alert", async () => {
    stubFetch(Response.json({ ok: false, error: "unauthorized" }), resendOk());
    const res = await handleLead(post(valid), env);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: FAILURE_MESSAGE });
    expect(calls.map((c) => c.url)).toEqual([SHEETS_URL]);
    const html = await handleLead(post(valid, false), env);
    expect(html.status).toBe(502);
    expect(html.headers.get("Location")).toBeNull();
  });

  it("sheet request throws or is not configured: failure state", async () => {
    stubFetch("throw", resendOk());
    expect((await handleLead(post(valid), env)).status).toBe(502);
    stubFetch(sheetsOk(), resendOk());
    expect((await handleLead(post(valid), { ...env, SHEETS_TOKEN: "" })).status).toBe(502);
    expect(calls).toEqual([]);
  });

  it("Resend down: still ok, the lead is in the sheet", async () => {
    stubFetch(sheetsOk(), "throw");
    expect((await handleLead(post(valid), env)).status).toBe(200);
  });
});

describe("parseLead", () => {
  function toForm(o: Record<string, string>) {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  }

  it("handle gets one @; bad date uses now; unknown optional answer is dropped", () => {
    const r = parseLead(
      toForm({ ...valid, instagram: "@@ han ane", sent_at: "nope", heard: "<script>" }),
      new Date("2026-11-08T12:00:00Z"),
    );
    expect(r.ok && r.lead.instagram).toBe("@hanane");
    expect(r.ok && r.lead.timestamp).toBe("2026-11-08T12:00:00.000Z");
    expect(r.ok && r.lead.heardAbout).toBe("");
  });

  it("every required choice must be one of the options", () => {
    const r = parseLead(toForm({ ...valid, language: "", channel: "Fax" }));
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["channel", "language"]);
  });
});
