import type { Failure } from "./env";

/** Resend's shared test sender. Replace once arcbuildr.co is verified in Resend. */
export const ALERT_FROM = "Arcbuildr <onboarding@resend.dev>";

export type SendAlertResult = { ok: true; id: string } | Failure;

export interface AlertMessage {
  subject: string;
  text: string;
  idempotencyKey?: string;
}

export async function sendAlert(
  env: { RESEND_API_KEY?: string; ALERT_EMAIL?: string },
  message: AlertMessage,
): Promise<SendAlertResult> {
  if (!env.RESEND_API_KEY) return { ok: false, error: "missing RESEND_API_KEY" };
  if (!env.ALERT_EMAIL) return { ok: false, error: "missing ALERT_EMAIL" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {}),
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

/** One email to a lead. */
export interface Mail extends AlertMessage {
  to: string;
  headers?: Record<string, string>;
}

/** Sends one plain-text email to a lead, from MAIL_FROM. */
export async function sendMail(
  env: { RESEND_API_KEY?: string; MAIL_FROM?: string; MAIL_REPLY_TO?: string },
  mail: Mail,
): Promise<SendAlertResult> {
  if (!env.RESEND_API_KEY) return { ok: false, error: "missing RESEND_API_KEY" };
  if (!env.MAIL_FROM) return { ok: false, error: "missing MAIL_FROM" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(mail.idempotencyKey ? { "Idempotency-Key": mail.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        ...(env.MAIL_REPLY_TO ? { reply_to: env.MAIL_REPLY_TO } : {}),
        ...(mail.headers ? { headers: mail.headers } : {}),
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
