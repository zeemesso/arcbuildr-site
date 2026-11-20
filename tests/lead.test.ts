import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/lib/env";
import { handleLead, parseEntry } from "../src/lib/lead";
import { LEAD_KEYS } from "../src/lib/sheets";
import worker from "../src/worker";

const SHEETS_URL = "https://storage.example.test/exec";
const env = {
  SHEETS_URL,
  SHEETS_TOKEN: "test-only-storage-value",
  RESEND_API_KEY: "test-only-mail-value",
  ALERT_EMAIL: "alerts@example.test",
} as Env;
const valid = {
  name: "Test Person",
  email: "person@example.test",
  src: "ig",
  tz: "Africa/Casablanca",
  page: "/?src=ig",
  utm: "utm_source=ig",
};
/** The same entry, named as the sheet's script reads it. */
const saved = {
  name: valid.name,
  email: valid.email,
  phone: "",
  instagram: "",
  language: "",
  channel: valid.src,
  budget: "",
  decisionMaker: "",
  need: "",
  timing: "",
  heardAbout: "",
  referredBy: "",
  timeZone: valid.tz,
  sourcePage: valid.page,
  utm: valid.utm,
};
const NOW = "2026-11-18T10:00:00.000Z";
const parse = (fields: Record<string, string> = {}) =>
  parseEntry(new URLSearchParams({ ...valid, ...fields }));
function entry(fields: Record<string, string> = {}) {
  const result = parse(fields);
  if (!result.ok) throw new Error("Expected a valid entry");
  return result.lead;
}
function post(fields: Record<string, string> = {}, headers: HeadersInit = {}) {
  return new Request("https://site.test/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", ...headers },
    body: new URLSearchParams({ ...valid, ...fields }),
  });
}
function context() {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    waitUntil: vi.fn((promise: Promise<unknown>) => {
      pending.push(promise);
    }),
  };
}
const fetchMock = vi.fn<typeof fetch>();
async function emptyResponse(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(await response.text()).toBe("");
  expect([...response.headers.keys()].some((key) => key.startsWith("access-control-"))).toBe(false);
}
function callBody(index: number) {
  return JSON.parse(fetchMock.mock.calls[index]![1]!.body as string);
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => Response.json({ ok: true, id: "test-alert" }));
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("parseEntry", () => {
  it("names the fields as the sheet's script reads them and ignores client time and unknown fields", () => {
    expect(
      entry({ sent_at: "1999-01-01", received_at: "1999-01-01", timestamp: "1999", status: "won" }),
    ).toEqual(saved);
  });
  it("has every key the script reads, and no other, once the server adds the time", () => {
    expect(["timestamp", ...Object.keys(entry())].sort()).toEqual([...LEAD_KEYS].sort());
  });
  it("passes the optional fields through under the script's names", () => {
    expect(
      entry({
        phone: "+1 555 0100",
        profile: "@test.person",
        language: "English",
        budget: "Under 750 USD",
        decides: "Me",
        need: "Scripts",
        timing: "January",
        heard: "A friend",
        referred: "Test Friend",
      }),
    ).toMatchObject({
      phone: "+1 555 0100",
      instagram: "@test.person",
      language: "English",
      budget: "Under 750 USD",
      decisionMaker: "Me",
      need: "Scripts",
      timing: "January",
      heardAbout: "A friend",
      referredBy: "Test Friend",
    });
  });
  it("cuts an optional field to 300 characters on one line", () => {
    expect(entry({ need: "a\nb" + "x".repeat(400) }).need).toHaveLength(300);
    expect(entry({ need: "a\n\tb" }).need).toBe("a b");
  });
  it("trims name and email, collapses whitespace and controls, and lowercases email", () => {
    expect(
      entry({ name: " \t Test\u0000\u0085\n  Person \r", email: " PERSON@Example.TEST \n" }),
    ).toMatchObject({
      name: "Test Person",
      email: "person@example.test",
    });
  });
  it("accepts a minimal name and the 200 character bound", () => {
    expect(entry({ name: "X" }).name).toBe("X");
    expect(entry({ name: "x".repeat(200) }).name).toHaveLength(200);
    expect(parse({ name: "x".repeat(201) }).ok).toBe(false);
  });
  it.each(["", " \n\t ", "\u0000\u007f"])("rejects empty normalized name %j", (name) => {
    expect(parse({ name }).ok).toBe(false);
  });
  it("rejects missing required fields", () => {
    expect(parseEntry(new URLSearchParams({ email: valid.email })).ok).toBe(false);
    expect(parseEntry(new URLSearchParams({ name: valid.name })).ok).toBe(false);
  });
  it("enforces the 320 character email bound without truncating", () => {
    expect(entry({ email: `${"a".repeat(315)}@b.co` }).email).toHaveLength(320);
    expect(parse({ email: `${"a".repeat(316)}@b.co` }).ok).toBe(false);
    expect(entry({ email: "a@b.co" }).email).toBe("a@b.co");
  });
  it.each([
    "",
    "no-at.test",
    "a@@b.test",
    "@b.test",
    "a@.test",
    "a@b",
    "a@b.c",
    "a b@c.test",
    "a@b. t",
    "a@b.test\nx",
  ])("rejects bad email %j", (email) => {
    expect(parse({ email }).ok).toBe(false);
  });
  it("normalizes src and accepts its bounds", () => {
    expect(entry({ src: "AB_1-z" }).channel).toBe("ab_1-z");
    expect(entry({ src: "a" }).channel).toBe("a");
    expect(entry({ src: "x".repeat(32) }).channel).toHaveLength(32);
  });
  it.each(["", "a".repeat(33), "with space", "a/b", "a.b", "é"])("falls back for src %j", (src) => {
    expect(entry({ src }).channel).toBe("direct");
  });
  it("accepts timezone characters and length bound", () => {
    expect(entry({ tz: "Etc/GMT+5_-" }).timeZone).toBe("Etc/GMT+5_-");
    expect(entry({ tz: "A".repeat(64) }).timeZone).toHaveLength(64);
  });
  it.each(["", "A".repeat(65), "Africa/City Name", "UTC:1", "UTC\n", "中文"])(
    "drops invalid timezone %j",
    (tz) => {
      expect(entry({ tz }).timeZone).toBe("");
    },
  );
  it("accepts relative pages through 200 characters", () => {
    expect(entry({ page: "/" }).sourcePage).toBe("/");
    expect(entry({ page: "/" + "x".repeat(199) }).sourcePage).toHaveLength(200);
  });
  it.each([
    "",
    "https://site.test/",
    "relative",
    "/" + "x".repeat(200),
    "/\n",
    "/\u0000",
    "/\u007f",
    "/\u0085",
  ])("defaults invalid page %j", (page) => {
    expect(entry({ page }).sourcePage).toBe("/");
  });
  it("filters UTM keys, truncates values, retains duplicates and serializes", () => {
    const utm = new URLSearchParams([
      ["other", "drop"],
      ["utm_", "drop"],
      ["utm_UPPER", "drop"],
      ["utm_source1", "drop"],
      ["utm_" + "a".repeat(21), "drop"],
      ["utm_a", "a b&c"],
      ["utm_" + "z".repeat(20), "x".repeat(101)],
      ["utm_a", "repeat"],
      ["utm_b", ""],
      ["utm_c", "yes"],
      ["utm_d", "yes"],
      ["utm_e", "drop"],
    ]);
    expect([...new URLSearchParams(entry({ utm: utm.toString() }).utm)]).toEqual([
      ["utm_a", "a b&c"],
      ["utm_" + "z".repeat(20), "x".repeat(100)],
      ["utm_a", "repeat"],
      ["utm_b", ""],
      ["utm_c", "yes"],
      ["utm_d", "yes"],
    ]);
    expect(entry({ utm: "utm_a=a%20b" }).utm).toBe("utm_a=a+b");
  });
  it("defaults absent optional fields", () => {
    const result = parseEntry(new URLSearchParams({ name: "Test", email: valid.email }));
    expect(result.ok && result.lead).toMatchObject({
      channel: "direct",
      timeZone: "",
      sourcePage: "/",
      utm: "",
    });
  });
  it.each(["=SUM(1,2)", "+Test", "-Test", "@Test"])(
    "keeps formula-looking name %s for script-side escaping",
    (name) => {
      expect(entry({ name }).name).toBe(name);
    },
  );
});

describe("lead handler", () => {
  it.each(["GET", "PUT", "DELETE", "OPTIONS", "HEAD"])(
    "returns 405 for %s through the Worker route",
    async (method) => {
      const response = await worker.fetch(
        new Request("https://site.test/api/lead", { method }) as Parameters<typeof worker.fetch>[0],
        env,
        context() as unknown as ExecutionContext,
      );
      await emptyResponse(response, 405);
      expect(response.headers.get("Allow")).toBe("POST");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it.each([
    "application/json",
    "multipart/form-data",
    "text/plain",
    "application/x-www-form-urlencoded-evil",
    "",
  ])("returns 415 for %j", async (type) => {
    await emptyResponse(await handleLead(post({}, { "Content-Type": type }), env, context()), 415);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("checks actual UTF-8 bytes despite a false Content-Length", async () => {
    for (const body of ["x".repeat(4097), "é".repeat(2049)]) {
      const request = new Request("https://site.test/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": "1" },
        body,
      });
      await emptyResponse(await handleLead(request, env, context()), 413);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("accepts exactly 4096 bytes and ignores an inflated Content-Length", async () => {
    const base = new URLSearchParams(valid).toString() + "&ignored=";
    const request = new Request("https://site.test/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": "9999" },
      body: base + "x".repeat(4096 - base.length),
    });
    const ctx = context();
    await emptyResponse(await handleLead(request, env, ctx), 204);
    await Promise.all(ctx.pending);
  });
  it.each(["https://foreign.test", "null", "", "https://site.test/"])(
    "rejects foreign Origin %j",
    async (origin) => {
      await emptyResponse(await handleLead(post({}, { Origin: origin }), env, context()), 403);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it.each([{ name: "" }, { email: "bad" }] as Record<string, string>[])(
    "rejects invalid required fields %j",
    async (fields) => {
      await emptyResponse(await handleLead(post(fields), env, context()), 400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("handles unreadable request bodies", async () => {
    const request = post();
    vi.spyOn(request, "text").mockRejectedValue(new Error("read failed"));
    await emptyResponse(await handleLead(request, env, context()), 400);
  });
  it.each([
    { SHEETS_URL: "" },
    { SHEETS_TOKEN: "" },
    { SHEETS_URL: undefined, SHEETS_TOKEN: undefined },
  ])("silently skips unconfigured storage %j", async (missing) => {
    const ctx = context();
    await emptyResponse(await handleLead(post(), { ...env, ...missing }, ctx), 204);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ctx.waitUntil).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledExactlyOnceWith("lead: storage not configured");
  });
  it("sends exactly one Sheets call with the token and the keys the script reads", async () => {
    const ctx = context();
    await emptyResponse(
      await handleLead(
        post({ received_at: "client-time" }, { Origin: "https://site.test" }),
        { ...env, RESEND_API_KEY: undefined },
        ctx,
      ),
      204,
    );
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
    await Promise.all(ctx.pending);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(SHEETS_URL);
    expect(callBody(0)).toEqual({
      token: env.SHEETS_TOKEN,
      lead: { timestamp: NOW, ...saved },
    });
    expect(Object.keys(callBody(0).lead).sort()).toEqual([...LEAD_KEYS].sort());
  });
  it("responds before storage resolves and alerts only after a successful save", async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    const ctx = context();
    await emptyResponse(await handleLead(post(), env, ctx), 204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finish(Response.json({ ok: true }));
    await Promise.all(ctx.pending);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]![0]).toBe("https://api.resend.com/emails");
    expect(callBody(1)).toMatchObject({
      subject: `Application started: ${valid.name}`,
      text: [
        `Name: ${valid.name}`,
        `Email: ${valid.email}`,
        `Channel: ${valid.src}`,
        `Time zone: ${valid.tz}`,
        `Page: ${valid.page}`,
        `Utm: ${valid.utm}`,
        `Time: ${NOW}`,
      ].join("\n"),
    });
  });
  it.each([
    { RESEND_API_KEY: undefined },
    { ALERT_EMAIL: undefined },
    { RESEND_API_KEY: "", ALERT_EMAIL: "" },
  ])("requires both alert variables %j", async (missing) => {
    const ctx = context();
    await emptyResponse(await handleLead(post(), { ...env, ...missing }, ctx), 204);
    await Promise.all(ctx.pending);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each(["rejected", "http", "throw", "malformed"])(
    "keeps 204 and sends no alert on Sheets failure: %s",
    async (failure) => {
      fetchMock.mockImplementationOnce(async () => {
        if (failure === "throw") throw new Error("offline");
        if (failure === "http") return Response.json({ ok: true }, { status: 500 });
        if (failure === "malformed") return new Response("not JSON");
        return Response.json({ ok: false });
      });
      const ctx = context();
      await emptyResponse(await handleLead(post(), env, ctx), 204);
      await expect(Promise.all(ctx.pending)).resolves.toEqual([undefined]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
  it("contains alert failures in the background task", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockRejectedValueOnce(new Error("offline"));
    const ctx = context();
    await emptyResponse(await handleLead(post(), env, ctx), 204);
    await expect(Promise.all(ctx.pending)).resolves.toEqual([undefined]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
