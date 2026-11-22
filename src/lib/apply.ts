import type { Env } from "./env";
import { EMAIL, line, origin } from "./lead";
import { saveToSheet, type SheetApplication, type SheetLead } from "./sheets";
import { application as form } from "../content/site";
import { BOOKED_PATH, BOOKING_URL } from "../config";

/** The largest body the form can send, with room to spare: 8 answers of 1,000 characters at most. */
const MAX_BYTES = 16384;
const ANSWER_MAX = 1000;

export type ParsedApplication =
  | {
      ok: true;
      trapped: boolean;
      lead: Omit<SheetLead, "timestamp">;
      application: Omit<SheetApplication, "submittedAt">;
    }
  | { ok: false };

/** Keeps line breaks in a long answer; drops other control characters. */
const answer = (value: unknown) =>
  (typeof value === "string" ? value : "")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "")
    .trim()
    .slice(0, ANSWER_MAX);

/** Checks one application as the form sends it. Every question must be answered. */
export function parseApplication(body: unknown): ParsedApplication {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false };
  const data = body as Record<string, unknown>;
  const id = typeof data.id === "string" ? data.id : "";
  const name = line(data.name, 201);
  const email = typeof data.email === "string" ? data.email.trim() : "";
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return { ok: false };
  if (!name || name.length > 200 || email.length > 320 || !EMAIL.test(email)) return { ok: false };
  const given =
    data.answers && typeof data.answers === "object"
      ? (data.answers as Record<string, unknown>)
      : {};
  const answers: SheetApplication["answers"] = [];
  for (const question of form.questions) {
    const value = answer(given[question.id]);
    if (!value) return { ok: false };
    if (question.type === "choice" && !question.options.includes(value)) return { ok: false };
    answers.push({ id: question.id, question: question.q, answer: value });
  }
  // The tag the brief asks for: whether this person was shown the calendar. It becomes one more column.
  const kind = data.kind === "prep" ? "prep" : "application";
  const low = form.tooLow;
  const tooLow = answers.some((item) => item.id === low.id && item.answer === low.option);
  answers.push({
    id: "outcome",
    question: "Outcome",
    answer:
      kind === "prep"
        ? "Booked from a chat"
        : tooLow
          ? "Budget under the lowest price: no calendar shown"
          : "Calendar shown",
  });
  const from = origin(data);
  const by = Object.fromEntries(answers.map((item) => [item.id, item.answer])) as Record<
    string,
    string
  >;
  return {
    ok: true,
    // A person never sees the trap field. A program that fills it gets a calm answer and no row.
    trapped: typeof data.trap === "string" && data.trap.trim() !== "",
    // What a script that does not know applications yet can still save: one row in the Leads tab.
    // That tab has no column for three of the answers, so they ride in "need", after what the person sells.
    lead: {
      name,
      email: email.toLowerCase(),
      phone: "",
      instagram: by.profile!,
      language: "",
      budget: by.budget!,
      decisionMaker: by.decides!,
      need: [
        by.sell,
        `Videos say: ${by.stranger}`,
        `Films: ${by.film}`,
        `Posted in 30 days: ${by.count}`,
      ].join(" / "),
      timing: by.start!,
      heardAbout: "",
      referredBy: "",
      ...from,
    },
    application: {
      kind,
      id,
      name,
      email: email.toLowerCase(),
      timeZone: from.timeZone,
      sourcePage: from.sourcePage,
      utm: from.utm,
      answers,
    },
  };
}

/** What the sheet shows for a row that came from the plain form. */
export const PLAIN_MARK = "Plain form: the questions did not run or did not save";

export type ParsedPlain =
  | {
      ok: true;
      trapped: boolean;
      kind: "application" | "prep";
      /** The budget answer came along and is under the lowest price: no calendar for this person. */
      tooLow: boolean;
      lead: Omit<SheetLead, "timestamp">;
    }
  | { ok: false };

/**
 * The plain form: a name and an email, with whatever answers came along. It is what a visitor uses when
 * the questions could not run or did not save. It becomes one marked row in the Leads tab, so nobody is lost.
 * An answer the form does not offer is dropped, not refused.
 */
export function parsePlain(body: unknown): ParsedPlain {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false };
  const data = body as Record<string, unknown>;
  const name = line(data.name, 201);
  const email = typeof data.email === "string" ? data.email.trim() : "";
  if (!name || name.length > 200 || email.length > 320 || !EMAIL.test(email)) return { ok: false };
  const given =
    data.answers && typeof data.answers === "object" && !Array.isArray(data.answers)
      ? (data.answers as Record<string, unknown>)
      : {};
  const by: Record<string, string> = {};
  for (const question of form.questions) {
    const value = answer(given[question.id]);
    by[question.id] = question.type === "choice" && !question.options.includes(value) ? "" : value;
  }
  return {
    ok: true,
    trapped: typeof data.trap === "string" && data.trap.trim() !== "",
    kind: data.kind === "prep" ? "prep" : "application",
    tooLow: by[form.tooLow.id] === form.tooLow.option,
    lead: {
      name,
      email: email.toLowerCase(),
      phone: "",
      instagram: by.profile!,
      language: "",
      budget: by.budget!,
      decisionMaker: by.decides!,
      need: [
        PLAIN_MARK,
        by.sell,
        by.stranger && `Videos say: ${by.stranger}`,
        by.film && `Films: ${by.film}`,
        by.count && `Posted in 30 days: ${by.count}`,
      ]
        .filter(Boolean)
        .join(" / "),
      timing: by.start!,
      heardAbout: "",
      referredBy: "",
      ...origin(data),
    },
  };
}

/** A form sent by the browser itself, with no script: its fields, shaped like what the script sends. */
function fromFields(fields: URLSearchParams): Record<string, unknown> {
  const text = (key: string) => fields.get(key) ?? "";
  const id = text("ref");
  return {
    // The browser has no id to give when no script ran. The sheet only needs each one to be different.
    id: /^[A-Za-z0-9-]{8,64}$/.test(id) ? id : crypto.randomUUID(),
    name: text("name"),
    email: text("email"),
    kind: text("kind"),
    trap: text("company"),
    src: text("src"),
    tz: text("tz"),
    page: text("page"),
    utm: text("utm"),
    answers: Object.fromEntries(form.questions.map(({ id }) => [id, text(id)])),
  };
}

/** A browser that posted the form itself gets a page to go to, never a line of JSON. */
function onward(location: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: location, "cache-control": "no-store" },
  });
}

function json(status: number, ok: boolean, headers?: HeadersInit): Response {
  return new Response(JSON.stringify({ ok }), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

/**
 * POST /api/apply: saves one application and says whether the sheet has it.
 * The form keeps the answers on the visitor's device until this answers { ok: true }.
 *
 * Two senders. The form's script posts JSON and reads { ok }. With `plain: true` it is the plain form:
 * a name and an email are enough. A browser whose script never ran, or stopped, posts the form itself
 * (urlencoded): that is always the plain form, and its answer is a redirect, saved or not, because the
 * person must never land on an error. The redirect is built here, never taken from the request.
 */
export async function handleApply(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json(405, false, { Allow: "POST" });
  const mediaType = (request.headers.get("Content-Type") ?? "").split(";")[0]!.trim().toLowerCase();
  const native = mediaType === "application/x-www-form-urlencoded";
  if (!native && mediaType !== "application/json") return json(415, false);
  const from = request.headers.get("Origin");
  if (from !== null && from !== new URL(request.url).origin) return json(403, false);

  let text: string;
  try {
    text = await request.text();
  } catch {
    return json(400, false);
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES) return json(413, false);
  let body: unknown;
  if (native) body = fromFields(new URLSearchParams(text));
  else
    try {
      body = JSON.parse(text);
    } catch {
      return json(400, false);
    }
  const asked =
    native || (!!body && typeof body === "object" && "plain" in body && body.plain === true);
  // Every answer there and valid: it is saved whole, whichever form sent it. Otherwise the plain form
  // saves the name, the email and the answers that are valid.
  const full = parseApplication(body);
  const plain = !full.ok && asked ? parsePlain(body) : ({ ok: false } as const);
  const low = form.tooLow;
  const parsed = full.ok
    ? {
        trapped: full.trapped,
        kind: full.application.kind,
        tooLow: full.application.answers.some(
          (item) => item.id === low.id && item.answer === low.option,
        ),
        lead: full.lead,
        application: full.application,
      }
    : plain.ok
      ? { ...plain, application: undefined }
      : null;
  if (!parsed) return native ? onward("/#apply") : json(400, false);
  const next = () =>
    onward(
      parsed.kind === "prep"
        ? BOOKED_PATH
        : parsed.tooLow
          ? "/"
          : `${BOOKING_URL}?${new URLSearchParams({ name: parsed.lead.name, email: parsed.lead.email })}`,
    );
  if (parsed.trapped) return native ? next() : json(200, true);
  if (!env.SHEETS_URL || !env.SHEETS_TOKEN) {
    console.log("apply: storage not configured");
    return native ? next() : json(503, false);
  }
  const now = new Date().toISOString();
  const saved = await saveToSheet(env, {
    lead: { timestamp: now, ...parsed.lead },
    ...(parsed.application && { application: { submittedAt: now, ...parsed.application } }),
  });
  if (native) return next();
  return saved.ok ? json(200, true) : json(502, false);
}
