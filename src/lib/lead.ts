import type { Env } from "./env";
import { QUESTIONS, REQUIRED_CHOICES, values } from "../data/application";
import { normalizePhone } from "./phone";
import { saveLead, type SheetLead } from "./sheets";
import { sendAlert } from "./resend";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const FAILURE_MESSAGE =
  "We couldn't send your details. Try again, or DM us at @arcbuildr. What you typed is still here.";

const field = (data: FormData, key: string, max: number) => {
  const value = data.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
};

/** An answer counts only if it is one of the options in src/data/application.ts. */
const pick = (data: FormData, key: keyof typeof QUESTIONS) => {
  const value = field(data, key, 80);
  return values(QUESTIONS[key]).includes(value) ? value : "";
};

export type Parsed = { ok: true; lead: SheetLead } | { ok: false; errors: Record<string, string> };

/** Same rules as the script on the page, so a bypass of the script gets the same answer. */
export function parseLead(data: FormData, now = new Date()): Parsed {
  const name = field(data, "name", 200);
  const email = field(data, "email", 320);
  const phone = normalizePhone(field(data, "phone", 40));
  const handle = field(data, "instagram", 100).replace(/^@+/, "").replace(/\s+/g, "");
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Add your name.";
  if (!EMAIL.test(email)) errors.email = "Check your email address.";
  if (!phone) errors.phone = "Add your phone number with the country code.";
  if (!handle) errors.instagram = "Add your Instagram handle.";
  const choices = Object.fromEntries(REQUIRED_CHOICES.map((key) => [key, pick(data, key)]));
  for (const key of REQUIRED_CHOICES) if (!choices[key]) errors[key] = "Pick one.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const sentAt = new Date(field(data, "sent_at", 40));
  return {
    ok: true,
    lead: {
      timestamp: (Number.isNaN(sentAt.getTime()) ? now : sentAt).toISOString(),
      name,
      email,
      phone,
      instagram: `@${handle}`,
      language: choices.language!,
      channel: choices.channel!,
      budget: choices.budget!,
      decisionMaker: choices.decision!,
      need: choices.need!,
      timing: choices.timing!,
      heardAbout: pick(data, "heard"),
      referredBy: field(data, "referred_by", 200),
      timeZone: field(data, "tz", 64),
      sourcePage: field(data, "page", 500),
      utm: field(data, "utm", 500),
    },
  };
}

const oneLine = (value: string) => value.replace(/[\r\n]+/g, " ");

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// The no-JavaScript fallback page.
const PAGE_TEXT = {
  back: "Back to the form",
  badForm: "That didn't look like a form.",
  check: "Check the fields marked above.",
  failure: FAILURE_MESSAGE,
};

function page(message: string, status: number): Response {
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Arcbuildr</title><body style="font:1rem/1.6 system-ui;max-width:32rem;margin:3rem auto;padding:0 1.25rem"><p>${message}</p><p><a href="/#start">${PAGE_TEXT.back}</a></p></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "no-store" },
  });
}

export async function handleLead(request: Request, env: Env): Promise<Response> {
  const wantsJson = (request.headers.get("Accept") ?? "").includes("application/json");
  const fail = (key: keyof typeof PAGE_TEXT, status: number, extra: object = {}) =>
    wantsJson
      ? json({ ok: false, error: PAGE_TEXT[key], ...extra }, status)
      : page(PAGE_TEXT[key], status);

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return fail("badForm", 400);
  }

  const thanks = "/thanks";
  const parsed = parseLead(data);
  const next = (lead: { name: string; email: string }) =>
    `${thanks}?${new URLSearchParams({ name: lead.name, email: lead.email })}`;

  // Spam trap: a filled hidden field gets the same answer as a real lead, and nothing is stored.
  if (field(data, "website", 200)) {
    return wantsJson
      ? json({ ok: true }, 200)
      : new Response(null, { status: 303, headers: { Location: thanks } });
  }

  if (!parsed.ok) return fail("check", 400, { errors: parsed.errors });
  const { lead } = parsed;

  const saved = await saveLead(env, lead);
  if (!saved.ok) {
    console.error("lead: sheets failed", saved.error);
    // Preview hosts (*.workers.dev) show the cause to help setup; it never holds a secret.
    const preview = new URL(request.url).hostname.endsWith(".workers.dev");
    return fail("failure", 502, preview ? { detail: saved.error } : {});
  }

  // The lead is safe in the sheet. A failed alert is logged and does not stop the visitor.
  const alert = await sendAlert(env, {
    subject: oneLine(`New lead: ${lead.name} (${lead.timing}, ${lead.budget})`),
    text: [
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone}`,
      `Instagram: ${lead.instagram}`,
      `Call: ${lead.channel}, in ${lead.language}`,
      `Budget: ${lead.budget}`,
      `Decides: ${lead.decisionMaker}`,
      `Wants: ${lead.need}`,
      `Start: ${lead.timing}`,
      `Heard about us: ${lead.heardAbout || "-"}${lead.referredBy ? ` (referred by ${lead.referredBy})` : ""}`,
      `Time zone: ${lead.timeZone || "-"}`,
      `UTM: ${lead.utm || "-"}`,
    ].join("\n"),
  });
  if (!alert.ok) console.error("lead: resend failed", alert.error);

  return wantsJson
    ? json({ ok: true }, 200)
    : new Response(null, { status: 303, headers: { Location: next(lead) } });
}
