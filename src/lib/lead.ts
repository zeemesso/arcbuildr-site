import type { Env } from "./env";
import { createLead, type Lead, type LeadSource } from "./notion";
import { sendAlert } from "./resend";

const SOURCES: LeadSource[] = ["ig", "dm", "tt", "direct"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const FAILURE_MESSAGE =
  "We couldn't send your details. Try again, or DM us at @arcbuildr. What you typed is still here.";

const field = (data: FormData, key: string, max: number) => {
  const value = data.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
};

export type Parsed = { ok: true; lead: Lead } | { ok: false; errors: Record<string, string> };

/** Same rules as the script on the page, so a bypass of the script gets the same answer. */
export function parseLead(data: FormData, now = new Date()): Parsed {
  const name = field(data, "name", 200);
  const email = field(data, "email", 320);
  const handle = field(data, "instagram", 100).replace(/^@+/, "").replace(/\s+/g, "");
  const business = field(data, "business", 300);
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Add your name.";
  if (!EMAIL.test(email)) errors.email = "Check your email address.";
  if (!handle) errors.instagram = "Add your Instagram handle.";
  if (!business) errors.business = "Add one line about your business.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const src = field(data, "src", 10) as LeadSource;
  const sentAt = new Date(field(data, "sent_at", 40));
  return {
    ok: true,
    lead: {
      name,
      email,
      instagram: `@${handle}`,
      business,
      goal: field(data, "goal", 1000),
      source: SOURCES.includes(src) ? src : "direct",
      referrer: field(data, "referrer", 500),
      submittedAt: (Number.isNaN(sentAt.getTime()) ? now : sentAt).toISOString(),
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

function page(message: string, status: number): Response {
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Arcbuildr</title><body style="font:1rem/1.6 system-ui;max-width:32rem;margin:3rem auto;padding:0 1.25rem"><p>${message}</p><p><a href="/#start">Back to the form</a></p></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "no-store" },
  });
}

export async function handleLead(request: Request, env: Env): Promise<Response> {
  const wantsJson = (request.headers.get("Accept") ?? "").includes("application/json");
  const fail = (message: string, status: number, extra: object = {}) =>
    wantsJson ? json({ ok: false, error: message, ...extra }, status) : page(message, status);

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return fail("That didn't look like a form.", 400);
  }

  const parsed = parseLead(data);
  const next = (lead: { name: string; email: string }) =>
    `/thanks?${new URLSearchParams({ name: lead.name, email: lead.email })}`;

  // Spam trap: a filled hidden field gets the same answer as a real lead, and nothing is stored.
  if (field(data, "website", 200)) {
    return wantsJson
      ? json({ ok: true }, 200)
      : new Response(null, { status: 303, headers: { Location: "/thanks" } });
  }

  if (!parsed.ok) return fail("Check the fields marked above.", 400, { errors: parsed.errors });
  const { lead } = parsed;

  const notion = await createLead(env, lead);
  if (!notion.ok) {
    console.error("lead: notion failed", notion.error);
    return fail(FAILURE_MESSAGE, 502);
  }

  // The lead is safe in Notion. A failed alert is logged and does not stop the visitor.
  const alert = await sendAlert(env, {
    subject: oneLine(`New lead: ${lead.name} (${lead.source})`),
    text: [
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      `Instagram: ${lead.instagram}`,
      `Business: ${lead.business}`,
      `Goal: ${lead.goal || "-"}`,
      `Source: ${lead.source}`,
      `Notion row: ${notion.pageId}`,
    ].join("\n"),
  });
  if (!alert.ok) console.error("lead: resend failed", alert.error);

  return wantsJson
    ? json({ ok: true }, 200)
    : new Response(null, { status: 303, headers: { Location: next(lead) } });
}
