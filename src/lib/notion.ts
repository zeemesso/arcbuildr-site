import type { Failure } from "./env";

/** One pinned Notion API version. See PLAN.md, "Technical decisions". */
export const NOTION_VERSION = "2022-06-28";

export type LeadSource = "ig" | "dm" | "tt" | "direct";

export interface Lead {
  name: string;
  email: string;
  instagram: string;
  business: string;
  goal?: string;
  source: LeadSource;
  referrer?: string;
  /** ISO 8601 time. */
  submittedAt: string;
}

const clip = (value: string | undefined) => (value ?? "").slice(0, 1900);
const text = (value: string | undefined) => {
  const content = clip(value);
  return { rich_text: content ? [{ text: { content } }] : [] };
};

/** Notion properties for one lead row. Names match the "Arcbuildr leads" database. */
export function leadProperties(lead: Lead) {
  return {
    Name: { title: [{ text: { content: clip(lead.name) } }] },
    Email: { email: lead.email },
    Instagram: text(lead.instagram),
    Business: text(lead.business),
    Goal: text(lead.goal),
    Source: { select: { name: lead.source } },
    Referrer: text(lead.referrer),
    Submitted: { date: { start: lead.submittedAt } },
    Status: { select: { name: "New" } },
  };
}

export type CreateLeadResult = { ok: true; pageId: string; version: string } | Failure;

export async function createLead(
  env: { NOTION_TOKEN?: string; NOTION_DATABASE_ID?: string },
  lead: Lead,
): Promise<CreateLeadResult> {
  if (!env.NOTION_TOKEN) return { ok: false, error: "missing NOTION_TOKEN" };
  if (!env.NOTION_DATABASE_ID) return { ok: false, error: "missing NOTION_DATABASE_ID" };
  try {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: env.NOTION_DATABASE_ID },
        properties: leadProperties(lead),
      }),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; code?: string };
    if (res.ok && body.id) return { ok: true, pageId: body.id, version: NOTION_VERSION };
    return { ok: false, error: `notion ${res.status} ${body.code ?? "no_code"}` };
  } catch (err) {
    return { ok: false, error: `notion request failed: ${(err as Error).name}` };
  }
}
