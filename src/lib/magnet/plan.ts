import type { Env } from "../env";
import { getMagnet } from "../../magnets/registry";
import { TOKEN, type PlanState } from "./contract";
import { json } from "./intake";
import { firstName } from "./prompt";
import { renderMarkdown } from "./render";
import { getLeadByToken } from "./store";
import { PLAN_TEXT } from "./text";

// GET /api/magnet/plan/<token>: what the result page shows. The token is the only key:
// 128 random bits, sent to nobody but the lead.

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export async function handlePlan(env: Env, token: string): Promise<Response> {
  const answer = (state: PlanState, status = 200) => json(state, status);
  if (!TOKEN.test(token)) return answer({ status: "unavailable", message: PLAN_TEXT.badLink }, 404);
  if (!env.DB) {
    console.error("magnet: no DB binding");
    // "working" keeps the page asking, which is right for a fault on our side.
    return answer({ status: "working" }, 503);
  }
  let lead;
  try {
    lead = await getLeadByToken(env.DB, token);
  } catch (err) {
    console.error("magnet: plan lookup failed", (err as Error).message);
    return answer({ status: "working" }, 503);
  }
  if (!lead) return answer({ status: "unavailable", message: PLAN_TEXT.badLink }, 404);

  switch (lead.status) {
    case "done":
      return answer({
        status: "ready",
        title: capital(getMagnet(lead.magnet)?.deliverableName ?? "your plan"),
        name: firstName(lead.name),
        html: renderMarkdown(lead.deliverable ?? ""),
      });
    case "rejected":
      return answer({ status: "unavailable", message: PLAN_TEXT.rejected });
    case "held":
    case "failed":
      return answer({ status: "unavailable", message: PLAN_TEXT.held });
    default:
      return answer({ status: "working" });
  }
}
