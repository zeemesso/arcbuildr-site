import type { Env } from "./env";
import { saveLead, type SheetLead } from "./sheets";
import { sendAlert } from "./resend";

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/;

type Entry = Omit<SheetLead, "timestamp">;
export type Parsed = { ok: true; lead: Entry } | { ok: false };

/** One line of text: no control characters, no runs of spaces, cut to `max`. */
export const line = (value: unknown, max: number) =>
  (typeof value === "string" ? value : "")
    .replace(/[\s\u0000-\u001f\u007f-\u009f]+/g, " ")
    .trim()
    .slice(0, max);

/** Where the visitor came from, as the page sent it. Anything odd becomes the safe default. */
export function origin(data: { src?: unknown; tz?: unknown; page?: unknown; utm?: unknown }) {
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const src = text(data.src).toLowerCase();
  const tz = text(data.tz);
  const page = text(data.page);
  const utm = new URLSearchParams();
  let pairs = 0;
  for (const [key, value] of new URLSearchParams(text(data.utm))) {
    if (!/^utm_[a-z]{1,20}$/.test(key)) continue;
    utm.append(key, value.slice(0, 100));
    if (++pairs === 6) break;
  }
  return {
    channel: /^[a-z0-9_-]{1,32}$/.test(src) ? src : "direct",
    timeZone: tz.length <= 64 && /^[A-Za-z0-9_+\-/]+$/.test(tz) ? tz : "",
    sourcePage: page.startsWith("/") && page.length <= 200 && !CONTROLS.test(page) ? page : "/",
    utm: utm.toString(),
  };
}

/**
 * Validates the fields of one lead and names them as the sheet's script expects (LEAD_KEYS).
 * The page sends name, email, src, tz, page and utm. The other fields are optional: the page has no
 * field for them today, and they are empty cells unless something sends them.
 * The handler supplies the server time.
 */
export function parseEntry(data: URLSearchParams): Parsed {
  const name = line(data.get("name"), 201);
  const email = (data.get("email") ?? "").trim();
  if (!name || name.length > 200 || email.length > 320 || !EMAIL.test(email)) {
    return { ok: false };
  }
  const get = (key: string) => line(data.get(key), 300);
  return {
    ok: true,
    lead: {
      name,
      email: email.toLowerCase(),
      phone: get("phone"),
      instagram: get("profile"),
      language: get("language"),
      budget: get("budget"),
      decisionMaker: get("decides"),
      need: get("need"),
      timing: get("timing"),
      heardAbout: get("heard"),
      referredBy: get("referred"),
      ...origin({
        src: data.get("src"),
        tz: data.get("tz"),
        page: data.get("page"),
        utm: data.get("utm"),
      }),
    },
  };
}

function empty(status: number, headers?: HeadersInit): Response {
  return new Response(null, { status, headers });
}

async function storeEntry(env: Env, lead: SheetLead): Promise<void> {
  try {
    const saved = await saveLead(env, lead);
    if (!saved.ok || !env.RESEND_API_KEY || !env.ALERT_EMAIL) return;
    await sendAlert(env, {
      subject: `Application started: ${lead.name}`,
      text: [
        `Name: ${lead.name}`,
        `Email: ${lead.email}`,
        `Channel: ${lead.channel}`,
        `Time zone: ${lead.timeZone}`,
        `Page: ${lead.sourcePage}`,
        `Utm: ${lead.utm}`,
        `Time: ${lead.timestamp}`,
      ].join("\n"),
    });
  } catch {
    // Background failures must never affect the visitor or disclose personal data.
  }
}

export async function handleLead(
  request: Request,
  env: Env,
  ctx: Pick<ExecutionContext, "waitUntil">,
): Promise<Response> {
  if (request.method !== "POST") return empty(405, { Allow: "POST" });
  const mediaType = (request.headers.get("Content-Type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (mediaType !== "application/x-www-form-urlencoded") return empty(415);
  const from = request.headers.get("Origin");
  if (from !== null && from !== new URL(request.url).origin) return empty(403);

  let text: string;
  try {
    text = await request.text();
  } catch {
    return empty(400);
  }
  if (new TextEncoder().encode(text).byteLength > 4096) return empty(413);
  const parsed = parseEntry(new URLSearchParams(text));
  if (!parsed.ok) return empty(400);
  if (!env.SHEETS_URL || !env.SHEETS_TOKEN) {
    console.log("lead: storage not configured");
    return empty(204);
  }
  const lead: SheetLead = { timestamp: new Date().toISOString(), ...parsed.lead };
  ctx.waitUntil(storeEntry(env, lead));
  return empty(204);
}
