import type { Env } from "./env";
import { saveLead, type SheetLead } from "./sheets";
import { sendAlert } from "./resend";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/;

type Entry = Omit<SheetLead, "received_at">;
export type Parsed = { ok: true; lead: Entry } | { ok: false };

/** Validates only entry fields. The handler supplies the server timestamp. */
export function parseEntry(data: URLSearchParams): Parsed {
  const name = (data.get("name") ?? "").replace(/[\s\u0000-\u001f\u007f-\u009f]+/g, " ").trim();
  const email = (data.get("email") ?? "").trim();
  if (!name || name.length > 200 || email.length > 320 || !EMAIL.test(email)) {
    return { ok: false };
  }

  const src = (data.get("src") ?? "").toLowerCase();
  const tz = data.get("tz") ?? "";
  const page = data.get("page") ?? "";
  const utm = new URLSearchParams();
  let pairs = 0;
  for (const [key, value] of new URLSearchParams(data.get("utm") ?? "")) {
    if (!/^utm_[a-z]{1,20}$/.test(key)) continue;
    utm.append(key, value.slice(0, 100));
    if (++pairs === 6) break;
  }
  return {
    ok: true,
    lead: {
      name,
      email: email.toLowerCase(),
      src: /^[a-z0-9_-]{1,32}$/.test(src) ? src : "direct",
      tz: tz.length <= 64 && /^[A-Za-z0-9_+\-/]+$/.test(tz) ? tz : "",
      page: page.startsWith("/") && page.length <= 200 && !CONTROLS.test(page) ? page : "/",
      utm: utm.toString(),
      status: "opened",
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
        `Src: ${lead.src}`,
        `Tz: ${lead.tz}`,
        `Page: ${lead.page}`,
        `Utm: ${lead.utm}`,
        `Time: ${lead.received_at}`,
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
  const origin = request.headers.get("Origin");
  if (origin !== null && origin !== new URL(request.url).origin) return empty(403);

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
  const lead: SheetLead = { received_at: new Date().toISOString(), ...parsed.lead };
  ctx.waitUntil(storeEntry(env, lead));
  return empty(204);
}
