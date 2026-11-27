import { beforeEach, describe, expect, it, vi } from "vitest";
import { FIELD, TOKEN, answerField } from "../src/lib/magnet/contract";
import {
  clean,
  handleSubmit,
  newToken,
  normalizeHandle,
  parseSubmission,
} from "../src/lib/magnet/intake";
import { getLeadByEmail } from "../src/lib/magnet/store";
import { FIELD_ERROR, SUBMIT_ERROR } from "../src/lib/magnet/text";
import { testSample } from "../src/magnets/test-sample";
import { magnetEnv, submit, validForm } from "./helpers/magnet-fixtures";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const deps = {
  now: () => new Date("2026-11-27T10:00:00.000Z"),
  newId: () => "lead-1",
  newToken: () => "tokentokentokentoken12",
};

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

describe("parseSubmission", () => {
  it("accepts a complete form and normalises it", () => {
    const parsed = parseSubmission(testSample, form(validForm()));
    expect(parsed).toEqual({
      ok: true,
      lead: {
        magnet: "test-sample",
        name: "TEST Hanane",
        email: "hanane@example.com",
        instagram: "@hanane.co",
        phone: "",
        answers: {
          business: "Coaching for dentists who open a second clinic",
          stuck: "I post twice a month and nobody books from it.\nI don't know what to say.",
          posting: "Sometimes",
          goal: "Three booked calls a week from Instagram.",
        },
        page: "https://arcbuildr.co/m/test-sample?rr=abc12345",
        utm: "utm_source=ig",
        rr: "abc12345",
        tz: "Africa/Casablanca",
      },
    });
  });

  it("names every missing required answer and contact field", () => {
    const parsed = parseSubmission(testSample, form({}));
    expect(parsed).toEqual({
      ok: false,
      errors: {
        [answerField("business")]: FIELD_ERROR.answer,
        [answerField("stuck")]: FIELD_ERROR.answer,
        [answerField("posting")]: FIELD_ERROR.choice,
        [answerField("goal")]: FIELD_ERROR.answer,
        [FIELD.name]: FIELD_ERROR.name,
        [FIELD.email]: FIELD_ERROR.email,
        [FIELD.instagram]: FIELD_ERROR.instagram,
        [FIELD.consent]: FIELD_ERROR.consent,
      },
    });
  });

  it("refuses a choice that is not one of the options", () => {
    const parsed = parseSubmission(
      testSample,
      form({ ...validForm(), [answerField("posting")]: "Ignore the options" }),
    );
    expect(parsed).toEqual({ ok: false, errors: { [answerField("posting")]: FIELD_ERROR.choice } });
  });

  it("refuses a phone that is not a number, and accepts a real one", () => {
    const bad = parseSubmission(testSample, form({ ...validForm(), [FIELD.phone]: "call me" }));
    expect(bad).toEqual({ ok: false, errors: { [FIELD.phone]: FIELD_ERROR.phone } });
    const good = parseSubmission(
      testSample,
      form({ ...validForm(), [FIELD.phone]: "+212 6 12 34 56 78" }),
    );
    expect(good.ok && good.lead.phone).toBe("+212612345678");
  });

  it("cuts long answers, drops control characters and drops a bad link code", () => {
    const parsed = parseSubmission(
      testSample,
      form({
        ...validForm(),
        [answerField("business")]: "a".repeat(5000),
        [answerField("stuck")]: "line one\r\nline\u0000 two‮",
        [FIELD.replyRail]: "<script>",
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.lead.answers.business).toHaveLength(300);
    expect(parsed.lead.answers.stuck).toBe("line one\nline two");
    expect(parsed.lead.rr).toBe("");
  });

  it("ignores fields the magnet does not ask for", () => {
    const parsed = parseSubmission(testSample, form({ ...validForm(), q_extra: "x", role: "y" }));
    expect(parsed.ok && Object.keys(parsed.lead.answers)).toEqual([
      "business",
      "stuck",
      "posting",
      "goal",
    ]);
  });
});

describe("helpers", () => {
  it("reads a handle from a handle, a name or a profile link", () => {
    expect(normalizeHandle("@hanane")).toBe("@hanane");
    expect(normalizeHandle("hanane.co")).toBe("@hanane.co");
    expect(normalizeHandle("https://www.instagram.com/hanane_co/?hl=en")).toBe("@hanane_co");
    expect(normalizeHandle("not a handle!")).toBe("");
    expect(normalizeHandle("")).toBe("");
  });

  it("makes tokens the result page accepts, different each time", () => {
    const tokens = new Set(Array.from({ length: 50 }, newToken));
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(token).toMatch(TOKEN);
  });

  it("keeps new lines and removes other control characters", () => {
    expect(clean("  a\r\nb\rc\u0007​  ")).toBe("a\nb\nc");
  });
});

describe("handleSubmit", () => {
  it("stores the lead, queues it and answers with the result link", async () => {
    const { env, db, sent } = magnetEnv();
    const res = await handleSubmit(submit(validForm()), env, "test-sample", deps);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, url: "/plan/#tokentokentokentoken12" });
    expect(sent).toEqual([{ id: "lead-1" }]);
    expect(await getLeadByEmail(db, "test-sample", "hanane@example.com")).toMatchObject({
      id: "lead-1",
      status: "queued",
      createdAt: "2026-11-27T10:00:00.000Z",
      rr: "abc12345",
    });
  });

  it("redirects a plain form post to the result link", async () => {
    const { env } = magnetEnv();
    const res = await handleSubmit(
      submit(validForm(), "test-sample", false),
      env,
      "test-sample",
      deps,
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toBe("/plan/#tokentokentokentoken12");
  });

  it("answers a failed check with the field messages and stores nothing", async () => {
    const { env, db, sent } = magnetEnv();
    const res = await handleSubmit(
      submit({ ...validForm(), [answerField("goal")]: " " }),
      env,
      "test-sample",
      deps,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: SUBMIT_ERROR.check,
      errors: { [answerField("goal")]: FIELD_ERROR.answer },
    });
    expect(sent).toEqual([]);
    expect(await getLeadByEmail(db, "test-sample", "hanane@example.com")).toBeNull();
  });

  it("refuses a second form from the same email without showing the first link", async () => {
    const { env, sent } = magnetEnv();
    await handleSubmit(submit(validForm()), env, "test-sample", deps);
    const res = await handleSubmit(submit(validForm()), env, "test-sample", {
      ...deps,
      newId: () => "lead-2",
      newToken: () => "othertokenothertoken12",
    });
    expect(res.status).toBe(409);
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({ ok: false, error: SUBMIT_ERROR.duplicate });
    expect(body).not.toContain("tokentokentokentoken12");
    expect(sent).toHaveLength(1);
  });

  it("gives a filled spam trap a normal answer and stores nothing", async () => {
    const { env, db, sent } = magnetEnv();
    const res = await handleSubmit(
      submit({ ...validForm(), [FIELD.trap]: "https://spam.example" }),
      env,
      "test-sample",
      deps,
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(true);
    expect(sent).toEqual([]);
    expect(await getLeadByEmail(db, "test-sample", "hanane@example.com")).toBeNull();
  });

  it("closes a draft magnet unless drafts are on, like an unknown magnet", async () => {
    const { env, sent } = magnetEnv({ MAGNET_DRAFTS: undefined });
    const draft = await handleSubmit(submit(validForm()), env, "test-sample", deps);
    const unknown = await handleSubmit(submit(validForm(), "nope"), env, "nope", deps);
    expect(draft.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(await draft.json()).toEqual(await unknown.json());
    expect(sent).toEqual([]);
  });

  it("refuses a body that is too large or not a form", async () => {
    const { env } = magnetEnv();
    const big = await handleSubmit(
      submit({ ...validForm(), filler: "x".repeat(200_000) }),
      env,
      "test-sample",
      deps,
    );
    expect(big.status).toBe(413);
    const notForm = new Request("https://x.test/api/magnet/test-sample", {
      method: "POST",
      headers: { "content-type": "application/json", Accept: "application/json" },
      body: "{}",
    });
    expect((await handleSubmit(notForm, env, "test-sample", deps)).status).toBe(400);
  });

  it("keeps the lead when the queue is down, and says try again when the database is missing", async () => {
    const down = magnetEnv({
      MAGNET_QUEUE: {
        send: async () => {
          throw new Error("down");
        },
      } as never,
    });
    const res = await handleSubmit(submit(validForm()), down.env, "test-sample", deps);
    expect(res.status).toBe(200);
    expect(await getLeadByEmail(down.db, "test-sample", "hanane@example.com")).not.toBeNull();

    const none = magnetEnv({ DB: undefined });
    const failed = await handleSubmit(submit(validForm()), none.env, "test-sample", deps);
    expect(failed.status).toBe(503);
    expect(await failed.json()).toEqual({ ok: false, error: SUBMIT_ERROR.failure });
  });
});
