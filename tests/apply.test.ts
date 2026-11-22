import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../src/lib/env";
import { handleApply, parseApplication, parsePlain, PLAIN_MARK } from "../src/lib/apply";
import { LEAD_KEYS } from "../src/lib/sheets";
import { application as form } from "../src/content/site";
import { BOOKED_PATH, BOOKING_URL } from "../src/config";
import worker from "../src/worker";

const SHEETS_URL = "https://storage.example.test/exec";
const env = { SHEETS_URL, SHEETS_TOKEN: "test-only-storage-value" } as Env;
const NOW = "2026-11-21T10:00:00.000Z";
/** The choices of one question, as the form offers them. */
const options = (id: string) => {
  const question = form.questions.find((item) => item.id === id);
  if (!question || question.type !== "choice") throw new Error(`${id} is not a choice`);
  return question.options;
};
const answers = {
  profile: "@test.person",
  sell: "Bookkeeping. One client is worth 2,000 USD.",
  stranger: "That I do the books.",
  film: options("film")[0]!,
  count: options("count")[1]!,
  decides: options("decides")[0]!,
  start: options("start")[2]!,
  budget: options("budget")[1]!,
};
const valid = {
  id: "test-0001-abcd",
  name: "TEST Person",
  email: "Person@Example.test",
  answers,
  trap: "",
  kind: "application",
  src: "ig",
  tz: "Africa/Casablanca",
  page: "/?src=ig",
  utm: "utm_source=ig",
};
type Body = Record<string, unknown>;
const parse = (fields: Body = {}) => parseApplication({ ...valid, ...fields });
function good(fields: Body = {}) {
  const result = parse(fields);
  if (!result.ok) throw new Error("Expected a valid application");
  return result;
}
function post(body: unknown = valid, headers: HeadersInit = {}) {
  return new Request("https://site.test/api/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const fetchMock = vi.fn<typeof fetch>();
async function answer(response: Response, status: number, ok: boolean) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ ok });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect([...response.headers.keys()].some((key) => key.startsWith("access-control-"))).toBe(false);
}
const sent = () => JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => Response.json({ ok: true, application: true }));
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("parseApplication", () => {
  it("keeps the 8 answers in the form's order, with each question as its heading", () => {
    const { application } = good();
    // The 8 answers, then the tag that says what the person was shown.
    const eight = application.answers.slice(0, 8);
    expect(eight.map((item) => item.id)).toEqual(form.questions.map((question) => question.id));
    expect(eight.map((item) => item.question)).toEqual(
      form.questions.map((question) => question.q),
    );
    expect(eight.map((item) => item.answer)).toEqual(Object.values(answers));
    expect(application.answers.slice(8)).toEqual([
      { id: "outcome", question: "Outcome", answer: "Calendar shown" },
    ]);
    expect(application).toMatchObject({
      kind: "application",
      id: valid.id,
      name: "TEST Person",
      email: "person@example.test",
      timeZone: valid.tz,
      sourcePage: valid.page,
      utm: valid.utm,
    });
  });
  it("also builds one Leads row a script that does not know applications can save", () => {
    const { lead } = good();
    expect(["timestamp", ...Object.keys(lead)].sort()).toEqual([...LEAD_KEYS].sort());
    expect(lead).toMatchObject({
      name: "TEST Person",
      email: "person@example.test",
      instagram: answers.profile,
      budget: answers.budget,
      decisionMaker: answers.decides,
      timing: answers.start,
      channel: "ig",
      timeZone: valid.tz,
      sourcePage: valid.page,
      utm: valid.utm,
    });
    expect(lead.need).toBe(
      `${answers.sell} / Videos say: ${answers.stranger} / Films: ${answers.film} / Posted in 30 days: ${answers.count}`,
    );
  });
  it("marks the form answered after a chat booking", () => {
    expect(good({ kind: "prep" }).application.kind).toBe("prep");
    expect(good({ kind: "anything" }).application.kind).toBe("application");
  });
  it.each([null, undefined, "text", 4, [], [valid]])(
    "rejects a body that is not an object: %j",
    (body) => {
      expect(parseApplication(body).ok).toBe(false);
    },
  );
  it.each(["", "short", "has space 1", "x".repeat(65), "bad/char-0001", 12345678])(
    "rejects id %j",
    (id) => {
      expect(parse({ id }).ok).toBe(false);
    },
  );
  it.each([
    { name: "" },
    { name: "x".repeat(201) },
    { email: "bad" },
    { email: 4 },
    { email: `${"a".repeat(316)}@b.co` },
  ])("rejects %j", (fields) => {
    expect(parse(fields).ok).toBe(false);
  });
  it.each(form.questions.map((question) => question.id))("requires an answer to %s", (id) => {
    expect(parse({ answers: { ...answers, [id]: "" } }).ok).toBe(false);
    expect(parse({ answers: { ...answers, [id]: "  \n " } }).ok).toBe(false);
    const { [id]: _dropped, ...rest } = answers as Record<string, string>;
    expect(parse({ answers: rest }).ok).toBe(false);
  });
  it("rejects answers that are missing or not an object", () => {
    expect(parse({ answers: undefined }).ok).toBe(false);
    expect(parse({ answers: "profile" }).ok).toBe(false);
  });
  const choices = form.questions.filter((question) => question.type === "choice");
  it("tags a budget under the lowest price, and a booking made from a chat", () => {
    expect(form.tooLow.option).toBe("Under 750 USD");
    expect(options("budget")).toEqual([
      "Under 750 USD",
      "750 to 1,500 USD",
      "1,500 to 3,000 USD",
      "Over 3,000 USD",
    ]);
    const low = good({ answers: { ...answers, budget: form.tooLow.option } });
    expect(low.application.answers.at(-1)).toEqual({
      id: "outcome",
      question: "Outcome",
      answer: "Budget under the lowest price: no calendar shown",
    });
    expect(low.lead.budget).toBe("Under 750 USD");
    expect(good({ kind: "prep" }).application.answers.at(-1)!.answer).toBe("Booked from a chat");
  });
  it("asks five of the questions as a choice", () => {
    expect(choices.map((question) => question.id)).toEqual([
      "film",
      "count",
      "decides",
      "start",
      "budget",
    ]);
  });
  it.each(choices)("accepts only a choice the form offers for $id", ({ id, options }) => {
    for (const option of options)
      expect(parse({ answers: { ...answers, [id]: option } }).ok).toBe(true);
    expect(parse({ answers: { ...answers, [id]: "Something else entirely" } }).ok).toBe(false);
    expect(parse({ answers: { ...answers, [id]: options[0].toLowerCase() } }).ok).toBe(false);
  });
  it("keeps line breaks in a long answer, drops other control characters and cuts at 1,000", () => {
    const { application } = good({
      answers: { ...answers, sell: " line one\nline\u0000 two\u0085 ", stranger: "x".repeat(1200) },
    });
    expect(application.answers[1]!.answer).toBe("line one\nline two");
    expect(application.answers[2]!.answer).toHaveLength(1000);
  });
  it("flags a filled trap field and nothing else", () => {
    expect(good().trapped).toBe(false);
    expect(good({ trap: "   " }).trapped).toBe(false);
    expect(good({ trap: undefined }).trapped).toBe(false);
    expect(good({ trap: "Acme" }).trapped).toBe(true);
  });
  it("falls back to safe origin values", () => {
    expect(
      good({ src: "a b", tz: "UTC\n", page: "https://elsewhere.test/", utm: "x=1" }).application,
    ).toMatchObject({
      timeZone: "",
      sourcePage: "/",
      utm: "",
    });
  });
});

describe("apply handler", () => {
  it.each(["GET", "PUT", "DELETE"])(
    "returns 405 for %s through the Worker route",
    async (method) => {
      const response = await worker.fetch(
        new Request("https://site.test/api/apply", { method }) as Parameters<
          typeof worker.fetch
        >[0],
        env,
        { waitUntil: vi.fn() } as unknown as ExecutionContext,
      );
      await answer(response, 405, false);
      expect(response.headers.get("Allow")).toBe("POST");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it.each(["multipart/form-data", "text/plain", "application/json-evil", ""])(
    "returns 415 for %j",
    async (type) => {
      await answer(await handleApply(post(valid, { "Content-Type": type }), env), 415, false);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it.each(["https://foreign.test", "null", ""])("rejects foreign Origin %j", async (origin) => {
    await answer(await handleApply(post(valid, { Origin: origin }), env), 403, false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("refuses a body over 16,384 bytes, counted in UTF-8", async () => {
    for (const filler of ["x".repeat(16385), "é".repeat(8193)]) {
      await answer(await handleApply(post(JSON.stringify({ ...valid, filler })), env), 413, false);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["{", "", "[]", '"text"', JSON.stringify({ ...valid, email: "bad" })])(
    "returns 400 for %j",
    async (body) => {
      await answer(await handleApply(post(body), env), 400, false);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("handles an unreadable body", async () => {
    const request = post();
    vi.spyOn(request, "text").mockRejectedValue(new Error("read failed"));
    await answer(await handleApply(request, env), 400, false);
  });
  it("answers a filled trap calmly and saves nothing", async () => {
    await answer(await handleApply(post({ ...valid, trap: "Acme" }), env), 200, true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([{ SHEETS_URL: "" }, { SHEETS_TOKEN: undefined }])(
    "says it did not save when storage is not set up: %j",
    async (missing) => {
      await answer(await handleApply(post(), { ...env, ...missing }), 503, false);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("saves once, with the token, the lead row and the application, both at the server's time", async () => {
    await answer(await handleApply(post(valid, { Origin: "https://site.test" }), env), 200, true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe(SHEETS_URL);
    const body = sent();
    expect(Object.keys(body).sort()).toEqual(["application", "lead", "token"]);
    expect(body.token).toBe(env.SHEETS_TOKEN);
    expect(Object.keys(body.lead).sort()).toEqual([...LEAD_KEYS].sort());
    expect(body.lead.timestamp).toBe(NOW);
    expect(body.application).toMatchObject({ kind: "application", id: valid.id, submittedAt: NOW });
    expect(body.application.answers).toHaveLength(9);
  });
  it("ignores a time, a token or a status sent by the page", async () => {
    await handleApply(
      post({
        ...valid,
        token: "page-value",
        submittedAt: "1999",
        timestamp: "1999",
        status: "won",
      }),
      env,
    );
    const body = sent();
    expect(body.token).toBe(env.SHEETS_TOKEN);
    expect(body.application.submittedAt).toBe(NOW);
    expect(body.lead.timestamp).toBe(NOW);
    expect(JSON.stringify(body)).not.toContain("won");
  });
  it.each(["rejected", "http", "throw", "malformed"])(
    "says it did not save on a sheet failure: %s",
    async (failure) => {
      fetchMock.mockImplementationOnce(async () => {
        if (failure === "throw") throw new Error("offline");
        if (failure === "http") return Response.json({ ok: true }, { status: 500 });
        if (failure === "malformed") return new Response("not JSON");
        return Response.json({ ok: false });
      });
      await answer(await handleApply(post(), env), 502, false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
  it("accepts the answer of a script that saved the lead row only", async () => {
    fetchMock.mockImplementationOnce(async () => Response.json({ ok: true }));
    await answer(await handleApply(post(), env), 200, true);
  });
});

/** What a browser sends when it posts the form itself: the fields, urlencoded. */
function native(fields: Record<string, string>, headers: HeadersInit = {}) {
  return new Request("https://site.test/api/apply", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
    body: new URLSearchParams(fields).toString(),
  });
}
const bookingFor = (name: string, email: string) =>
  `${BOOKING_URL}?${new URLSearchParams({ name, email })}`;
function moved(response: Response, to: string) {
  expect(response.status).toBe(303);
  expect(response.headers.get("Location")).toBe(to);
  expect(response.headers.get("cache-control")).toBe("no-store");
}

describe("parsePlain", () => {
  it("takes a name and an email alone, and marks the row", () => {
    const result = parsePlain({ name: " TEST  Person ", email: "Person@Example.test" });
    expect(result).toMatchObject({
      ok: true,
      trapped: false,
      kind: "application",
      tooLow: false,
      lead: { name: "TEST Person", email: "person@example.test", need: PLAIN_MARK, budget: "" },
    });
  });
  it("keeps the answers that are valid and drops a choice the form does not offer", () => {
    const result = parsePlain({
      ...valid,
      answers: { profile: "@test.person", sell: "Bookkeeping.", film: "Something else", budget: 5 },
    });
    if (!result.ok) throw new Error("Expected a plain application");
    expect(result.lead.instagram).toBe("@test.person");
    expect(result.lead.need).toBe(`${PLAIN_MARK} / Bookkeeping.`);
    expect(result.lead.budget).toBe("");
    expect(result.lead.channel).toBe("ig");
  });
  it("knows a budget under the lowest price", () => {
    const result = parsePlain({ ...valid, answers: { budget: form.tooLow.option } });
    expect(result).toMatchObject({ ok: true, tooLow: true });
  });
  it.each([
    null,
    [],
    "text",
    { name: "", email: "a@b.test" },
    { name: "TEST", email: "bad" },
    { name: "TEST", email: 5 },
  ])("refuses %j", (body) => {
    expect(parsePlain(body)).toEqual({ ok: false });
  });
});

describe("apply handler, the plain form", () => {
  it("saves a name and an email as one marked lead row when the script asks for the plain form", async () => {
    const body = { id: valid.id, name: valid.name, email: valid.email, answers: {}, plain: true };
    await answer(await handleApply(post(body), env), 200, true);
    const out = sent();
    expect(Object.keys(out).sort()).toEqual(["lead", "token"]);
    expect(Object.keys(out.lead).sort()).toEqual([...LEAD_KEYS].sort());
    expect(out.lead).toMatchObject({ name: valid.name, timestamp: NOW, need: PLAIN_MARK });
  });
  it("saves the whole application when the plain form carries every answer", async () => {
    await answer(await handleApply(post({ ...valid, plain: true }), env), 200, true);
    const out = sent();
    expect(out.application).toMatchObject({ id: valid.id, kind: "application" });
    expect(out.application.answers).toHaveLength(9);
    expect(out.lead.need).not.toContain(PLAIN_MARK);
  });
  it("still refuses half an application that does not ask for the plain form", async () => {
    await answer(await handleApply(post({ ...valid, answers: {} }), env), 400, false);
    await answer(await handleApply(post({ ...valid, answers: {}, plain: "yes" }), env), 400, false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("says so when the plain form did not save", async () => {
    fetchMock.mockImplementationOnce(async () => Response.json({ ok: false }));
    await answer(await handleApply(post({ ...valid, answers: {}, plain: true }), env), 502, false);
  });
});

describe("apply handler, a form posted by the browser itself", () => {
  const fields = { name: "TEST Person", email: "Person@Example.test" };
  it("saves the name and the email, then sends the person to the booking page with both filled", async () => {
    const response = await handleApply(native(fields, { Origin: "https://site.test" }), env);
    moved(response, bookingFor("TEST Person", "person@example.test"));
    const out = sent();
    expect(Object.keys(out).sort()).toEqual(["lead", "token"]);
    expect(out.lead).toMatchObject({ name: "TEST Person", email: "person@example.test" });
    expect(out.lead.need).toBe(PLAIN_MARK);
  });
  it("goes through the Worker route", async () => {
    const response = await worker.fetch(native(fields) as Parameters<typeof worker.fetch>[0], env, {
      waitUntil: vi.fn(),
    } as unknown as ExecutionContext);
    moved(response, bookingFor("TEST Person", "person@example.test"));
  });
  it.each(["rejected", "throw", "not set up"])(
    "sends the person on even when the sheet did not save: %s",
    async (failure) => {
      fetchMock.mockImplementationOnce(async () => {
        if (failure === "throw") throw new Error("offline");
        return Response.json({ ok: false });
      });
      const where = failure === "not set up" ? { ...env, SHEETS_URL: "" } : env;
      moved(
        await handleApply(native(fields), where),
        bookingFor("TEST Person", "person@example.test"),
      );
    },
  );
  it.each([{ name: "", email: "a@b.test" }, { name: "TEST", email: "a@b" }, {}])(
    "sends %j back to the two fields and saves nothing",
    async (bad) => {
      moved(await handleApply(native(bad as Record<string, string>), env), "/#apply");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it("saves the whole application, under the page's id, when every answer came along", async () => {
    const response = await handleApply(native({ ...fields, ...answers, ref: valid.id }), env);
    moved(response, bookingFor("TEST Person", "person@example.test"));
    const out = sent();
    expect(out.application).toMatchObject({ id: valid.id, kind: "application" });
    expect(out.application.answers).toHaveLength(9);
  });
  it("gives an application its own id when the browser had none to send", async () => {
    await handleApply(native({ ...fields, ...answers }), env);
    await handleApply(native({ ...fields, ...answers, ref: "bad id" }), env);
    const ids = fetchMock.mock.calls.map(
      (call) => JSON.parse(call[1]!.body as string).application.id,
    );
    expect(ids[0]).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(ids[1]).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    expect(ids[0]).not.toBe(ids[1]);
  });
  it("keeps the answers that came along in the lead row", async () => {
    await handleApply(native({ ...fields, profile: "@test.person", sell: "Bookkeeping." }), env);
    expect(sent().lead).toMatchObject({
      instagram: "@test.person",
      need: `${PLAIN_MARK} / Bookkeeping.`,
    });
  });
  it("sends someone who booked from a chat back to the page after the booking", async () => {
    moved(await handleApply(native({ ...fields, kind: "prep" }), env), BOOKED_PATH);
  });
  it("offers no calendar to a budget under the lowest price", async () => {
    moved(await handleApply(native({ ...fields, budget: form.tooLow.option }), env), "/");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("never takes the next page from the request", async () => {
    const response = await handleApply(
      native({ ...fields, next: "https://foreign.test", Location: "https://foreign.test" }),
      env,
    );
    expect(response.headers.get("Location")).toBe(bookingFor("TEST Person", "person@example.test"));
  });
  it("moves a filled trap on and saves nothing", async () => {
    moved(
      await handleApply(native({ ...fields, company: "Acme" }), env),
      bookingFor("TEST Person", "person@example.test"),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("refuses a foreign Origin and a body that is too large", async () => {
    await answer(
      await handleApply(native(fields, { Origin: "https://foreign.test" }), env),
      403,
      false,
    );
    await answer(
      await handleApply(native({ ...fields, sell: "x".repeat(16385) }), env),
      413,
      false,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
