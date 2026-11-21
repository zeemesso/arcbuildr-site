import type { Env } from "./env";
import { EMAIL, line, origin } from "./lead";
import { saveToSheet, type SheetApplication, type SheetLead } from "./sheets";
import { application as form } from "../content/site";

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
 */
export async function handleApply(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json(405, false, { Allow: "POST" });
  const mediaType = (request.headers.get("Content-Type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (mediaType !== "application/json") return json(415, false);
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
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, false);
  }
  const parsed = parseApplication(body);
  if (!parsed.ok) return json(400, false);
  if (parsed.trapped) return json(200, true);
  if (!env.SHEETS_URL || !env.SHEETS_TOKEN) {
    console.log("apply: storage not configured");
    return json(503, false);
  }
  const now = new Date().toISOString();
  const saved = await saveToSheet(env, {
    lead: { timestamp: now, ...parsed.lead },
    application: { submittedAt: now, ...parsed.application },
  });
  return saved.ok ? json(200, true) : json(502, false);
}
