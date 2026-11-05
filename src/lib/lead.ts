import type { Env } from "./env";
import { createLead, type Lead, type LeadSource } from "./notion";
import { sendAlert } from "./resend";

const SOURCES: LeadSource[] = ["ig", "dm", "tt", "direct"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const FAILURE_MESSAGE =
  "We couldn't send your details. Try again, or DM us at @arcbuildr. What you typed is still here.";

// Optional qualifying answers. Only these values are stored; anything else is dropped.
export const CAMERA = ["Yes", "I can try", "I'd rather not"];
export const START = ["This month", "In 1 to 2 months", "Just looking"];

const field = (data: FormData, key: string, max: number) => {
  const value = data.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
};

const pick = (data: FormData, key: string, allowed: string[]) => {
  const value = field(data, key, 40);
  return allowed.includes(value) ? value : "";
};

/** The page language the form was sent from. Anything unknown counts as English. */
export const leadLang = (data: FormData): "en" | "fr" =>
  field(data, "lang", 2) === "fr" ? "fr" : "en";

/** Folds the qualifying answers into the Goal text, so the Notion database needs no new columns. */
function goalWithAnswers(data: FormData) {
  const camera = pick(data, "camera", CAMERA);
  const start = pick(data, "start", START);
  const french = leadLang(data) === "fr" && "Language: French";
  return [
    field(data, "goal", 1000),
    camera && `On camera: ${camera}`,
    start && `Start: ${start}`,
    french,
  ]
    .filter(Boolean)
    .join("\n");
}

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
      goal: goalWithAnswers(data),
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

// The no-JavaScript fallback page, in the language of the form.
const PAGE_TEXT = {
  en: {
    back: "Back to the form",
    badForm: "That didn't look like a form.",
    check: "Check the fields marked above.",
    failure: FAILURE_MESSAGE,
  },
  fr: {
    back: "Retour au formulaire",
    badForm: "Ce formulaire n'a pas pu être lu.",
    check: "Vérifiez les champs du formulaire.",
    failure:
      "Nous n'avons pas pu envoyer vos informations. Réessayez, ou écrivez-nous en DM sur @arcbuildr.",
  },
};

function page(message: string, status: number, lang: "en" | "fr" = "en"): Response {
  const home = lang === "fr" ? "/fr/" : "/";
  const html = `<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Arcbuildr</title><body style="font:1rem/1.6 system-ui;max-width:32rem;margin:3rem auto;padding:0 1.25rem"><p>${message}</p><p><a href="${home}#start">${PAGE_TEXT[lang].back}</a></p></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "no-store" },
  });
}

export async function handleLead(request: Request, env: Env): Promise<Response> {
  const wantsJson = (request.headers.get("Accept") ?? "").includes("application/json");
  let lang: "en" | "fr" = "en";
  const fail = (key: keyof (typeof PAGE_TEXT)["en"], status: number, extra: object = {}) =>
    wantsJson
      ? json({ ok: false, error: PAGE_TEXT.en[key], ...extra }, status)
      : page(PAGE_TEXT[lang][key], status, lang);

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return fail("badForm", 400);
  }

  lang = leadLang(data);
  const thanks = lang === "fr" ? "/fr/thanks" : "/thanks";
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

  const notion = await createLead(env, lead);
  if (!notion.ok) {
    console.error("lead: notion failed", notion.error);
    return fail("failure", 502);
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
