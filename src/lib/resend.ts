import type { Failure } from "./env";

/** Resend's shared test sender. Replace once arcbuildr.co is verified in Resend. */
export const ALERT_FROM = "Arcbuildr <onboarding@resend.dev>";

export type SendAlertResult = { ok: true; id: string } | Failure;

export async function sendAlert(
  env: { RESEND_API_KEY?: string; ALERT_EMAIL?: string },
  message: { subject: string; text: string },
): Promise<SendAlertResult> {
  if (!env.RESEND_API_KEY) return { ok: false, error: "missing RESEND_API_KEY" };
  if (!env.ALERT_EMAIL) return { ok: false, error: "missing ALERT_EMAIL" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ALERT_FROM,
        to: [env.ALERT_EMAIL],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; name?: string };
    if (res.ok && body.id) return { ok: true, id: body.id };
    return { ok: false, error: `resend ${res.status} ${body.name ?? "no_name"}` };
  } catch (err) {
    return { ok: false, error: `resend request failed: ${(err as Error).name}` };
  }
}
