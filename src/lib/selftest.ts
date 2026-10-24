import type { BuildInfo, Env } from "./env";
import { createLead } from "./notion";
import { sendAlert } from "./resend";

const MIN_KEY_LENGTH = 16;

/** Same answer for every unknown or refused /api request, so nothing leaks. */
export function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=UTF-8", "cache-control": "no-store" },
  });
}

async function sameSecret(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i]! ^ vb[i]!;
  return diff === 0;
}

/** Preview-only: unknown branch counts as main, so the answer fails closed. */
export function isPreviewBranch(branch: string): boolean {
  return branch !== "main" && branch !== "unknown" && branch !== "";
}

export async function selftestAllowed(
  request: Request,
  env: Pick<Env, "SELFTEST_KEY">,
  info: BuildInfo,
): Promise<boolean> {
  if (!isPreviewBranch(info.branch)) return false;
  const key = env.SELFTEST_KEY;
  if (!key || key.length < MIN_KEY_LENGTH) return false;
  const header = request.headers.get("X-Selftest-Key");
  if (!header) return false;
  return sameSecret(header, key);
}

export async function handleSelftest(request: Request, env: Env, info: BuildInfo): Promise<Response> {
  if (request.method !== "GET" || !(await selftestAllowed(request, env, info))) return notFound();

  const now = new Date().toISOString();
  const notion = await createLead(env, {
    name: `TEST selftest ${now}`,
    email: "selftest@example.com",
    instagram: "@selftest",
    business: "Self-test row. Safe to delete.",
    goal: "Check that the Worker can write to Notion.",
    source: "direct",
    referrer: "selftest",
    submittedAt: now,
  });
  const resend = await sendAlert(env, {
    subject: `Arcbuildr self-test (${info.branch})`,
    text: [
      "The Worker reached Resend.",
      `Branch: ${info.branch} (${info.branchSource})`,
      `Commit: ${info.commit}`,
      notion.ok ? `Notion row: ${notion.pageId}` : `Notion failed: ${notion.error}`,
    ].join("\n"),
  });

  const ok = notion.ok && resend.ok;
  return new Response(
    JSON.stringify({
      ok,
      branch: info.branch,
      branchSource: info.branchSource,
      commit: info.commit,
      notion: notion.ok
        ? { ok: true, pageId: notion.pageId, version: notion.version }
        : { ok: false, error: notion.error },
      resend: resend.ok ? { ok: true, id: resend.id } : { ok: false, error: resend.error },
    }),
    {
      status: ok ? 200 : 502,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-robots-tag": "noindex",
      },
    },
  );
}
