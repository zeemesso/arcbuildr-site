import type { Env } from "../env";
import { normalizePhone } from "../phone";
import { getMagnet } from "../../magnets/registry";
import type { MagnetDefinition } from "../../magnets/types";
import {
  FIELD,
  LINK_CODE,
  MAX_LENGTH,
  answerField,
  planPagePath,
  type SubmitResult,
} from "./contract";
import { getLeadByEmail, insertLead, resendLink, type NewLead } from "./store";
import { FIELD_ERROR, SUBMIT_ERROR } from "./text";

// POST /api/magnet/<slug>: check a magnet form, store the lead, queue the writing.
// Everything in the form is untrusted. Only text that passes these checks is stored, and the
// stored text is the only thing the writer model ever sees.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;
/** Largest form body read. The longest honest form is far below this. */
const MAX_BODY_BYTES = 150_000;

/** Text as typed: line ends made uniform, control characters removed, outer space trimmed. */
export const clean = (value: string) =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .trim();

const field = (data: FormData, key: string, max: number) => {
  const value = data.get(key);
  return typeof value === "string" ? clean(value).slice(0, max) : "";
};

/** "@name", from "@name", "name" or a profile link. "" when it is not a handle. */
export function normalizeHandle(input: string): string {
  const name = input
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@+/, "")
    .replace(/\s+/g, "");
  return HANDLE.test(name) ? `@${name}` : "";
}

export type Submission = Omit<NewLead, "id" | "token" | "unsub" | "createdAt">;
export type Parsed = { ok: true; lead: Submission } | { ok: false; errors: Record<string, string> };

/** Same rules as the script on the page, so a bypass of the script gets the same answer. */
export function parseSubmission(magnet: MagnetDefinition, data: FormData): Parsed {
  const errors: Record<string, string> = {};

  const answers: Record<string, string> = {};
  for (const question of magnet.questions) {
    const key = answerField(question.id);
    const required = question.required !== false;
    if (question.kind === "choice") {
      const value = field(data, key, 200);
      if (question.options.some((option) => option.value === value)) answers[question.id] = value;
      else if (required || value) errors[key] = FIELD_ERROR.choice;
    } else {
      const value = field(data, key, MAX_LENGTH[question.kind]);
      if (value) answers[question.id] = value;
      else if (required) errors[key] = FIELD_ERROR.answer;
    }
  }

  const name = field(data, FIELD.name, 200).replace(/\n+/g, " ");
  const email = field(data, FIELD.email, 320).toLowerCase();
  const instagram = normalizeHandle(field(data, FIELD.instagram, 200));
  const rawPhone = field(data, FIELD.phone, 40);
  const phone = normalizePhone(rawPhone);
  if (!name) errors[FIELD.name] = FIELD_ERROR.name;
  if (!EMAIL.test(email)) errors[FIELD.email] = FIELD_ERROR.email;
  if (!instagram) errors[FIELD.instagram] = FIELD_ERROR.instagram;
  if (rawPhone && !phone) errors[FIELD.phone] = FIELD_ERROR.phone;
  if (!field(data, FIELD.consent, 10)) errors[FIELD.consent] = FIELD_ERROR.consent;
  if (Object.keys(errors).length) return { ok: false, errors };

  const rr = field(data, FIELD.replyRail, 80);
  return {
    ok: true,
    lead: {
      magnet: magnet.slug,
      name,
      email,
      instagram,
      phone,
      answers,
      page: field(data, FIELD.page, 500).replace(/\n+/g, " "),
      utm: field(data, FIELD.utm, 500).replace(/\n+/g, " "),
      rr: LINK_CODE.test(rr) ? rr : "",
      tz: field(data, FIELD.timeZone, 64).replace(/\n+/g, " "),
    },
  };
}

/** A result link token: 128 random bits as 22 characters of base64url. */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

/** The no-JavaScript answer. `message` and `back` are our own constants, never visitor text. */
function page(message: string, back: string, status: number): Response {
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Arcbuildr</title><body style="font:1rem/1.6 system-ui;max-width:32rem;margin:3rem auto;padding:0 1.25rem"><p>${message}</p><p><a href="${back}">Back to the form</a></p></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "no-store" },
  });
}

export interface IntakeDeps {
  now: () => Date;
  newId: () => string;
  newToken: () => string;
}
const DEPS: IntakeDeps = { now: () => new Date(), newId: () => crypto.randomUUID(), newToken };

export async function handleSubmit(
  request: Request,
  env: Env,
  slug: string,
  deps: IntakeDeps = DEPS,
): Promise<Response> {
  const wantsJson = (request.headers.get("Accept") ?? "").includes("application/json");
  const back = `/m/${slug}`;
  const fail = (error: string, status: number, errors?: Record<string, string>) =>
    wantsJson
      ? json({ ok: false, error, ...(errors ? { errors } : {}) } satisfies SubmitResult, status)
      : page(error, back, status);
  const done = (token: string) =>
    wantsJson
      ? json({ ok: true, url: planPagePath(token) } satisfies SubmitResult, 200)
      : new Response(null, { status: 303, headers: { Location: planPagePath(token) } });

  // An unknown magnet and a closed draft get the same answer.
  const magnet = getMagnet(slug);
  if (!magnet || (magnet.status === "draft" && env.MAGNET_DRAFTS !== "1"))
    return wantsJson
      ? fail(SUBMIT_ERROR.closed, 404)
      : new Response(SUBMIT_ERROR.closed, {
          status: 404,
          headers: { "cache-control": "no-store" },
        });

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES)
    return fail(SUBMIT_ERROR.tooBig, 413);
  let data: FormData;
  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return fail(SUBMIT_ERROR.tooBig, 413);
    data = await new Response(body, { headers: request.headers }).formData();
  } catch {
    return fail(SUBMIT_ERROR.badForm, 400);
  }

  // Spam trap: a filled hidden field gets the answer a real lead gets, and nothing is stored.
  if (field(data, FIELD.trap, 200)) return done(deps.newToken());

  const parsed = parseSubmission(magnet, data);
  if (!parsed.ok) return fail(SUBMIT_ERROR.check, 400, parsed.errors);

  if (!env.DB) {
    console.error("magnet: no DB binding");
    return fail(SUBMIT_ERROR.failure, 503);
  }
  const lead: NewLead = {
    ...parsed.lead,
    id: deps.newId(),
    token: deps.newToken(),
    unsub: deps.newToken(),
    createdAt: deps.now().toISOString(),
  };
  try {
    if (!(await insertLead(env.DB, lead))) {
      // The earlier link belongs to whoever owns the inbox, so it is never shown here.
      // It goes to that inbox again instead, at most once a day.
      const earlier = await getLeadByEmail(env.DB, lead.magnet, lead.email);
      if (earlier) await resendLink(env.DB, earlier.id, deps.now());
      return fail(SUBMIT_ERROR.duplicate, 409);
    }
  } catch (err) {
    console.error("magnet: insert failed", (err as Error).message);
    return fail(SUBMIT_ERROR.failure, 502);
  }

  // The lead is stored. If the queue is down, the hourly sweep finds it and queues it again.
  try {
    if (!env.MAGNET_QUEUE) throw new Error("no MAGNET_QUEUE binding");
    await env.MAGNET_QUEUE.send({ id: lead.id });
  } catch (err) {
    console.error("magnet: queue failed", lead.id, (err as Error).message);
  }
  return done(lead.token);
}
