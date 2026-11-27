import type { ModelCall } from "./prompt";
import { dayOf, spentOn, type Sql, type Usage } from "./store";

// Money. Every model call is priced here and counted against a daily cap, so a flood of
// forms can cost at most the cap. Prices are US dollars per million tokens, which is the
// same number as millionths of a dollar per token.

/** Checked against the published price list on 2026-11-27. Update when prices change. */
export const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
};
/** A model missing from the list is priced as the dearest one, so the cap errs on the safe side. */
const DEAREST = { input: 4, output: 20 };

/** The cap when MAGNET_DAILY_CAP_USD is not set, in US dollars per UTC day. */
export const DEFAULT_DAILY_CAP_USD = 3;

export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  /** Tokens written to and read from the prompt cache. Zero unless caching is turned on. */
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
}

/** What a finished call cost, in millionths of a dollar, rounded up. */
export function costMicroUsd(model: string, tokens: TokenCounts): number {
  const price = PRICES[model] ?? DEAREST;
  const input =
    tokens.inputTokens +
    (tokens.cacheWriteTokens ?? 0) * 1.25 +
    (tokens.cacheReadTokens ?? 0) * 0.1;
  return Math.ceil(input * price.input + tokens.outputTokens * price.output);
}

export const usageOf = (model: string, tokens: TokenCounts): Usage => ({
  model,
  inputTokens: tokens.inputTokens + (tokens.cacheWriteTokens ?? 0) + (tokens.cacheReadTokens ?? 0),
  outputTokens: tokens.outputTokens,
  costMicroUsd: costMicroUsd(model, tokens),
});

/** The most a call can cost before it is made: every prompt character a token, output full. */
export function worstCaseMicroUsd(call: ModelCall): number {
  const price = PRICES[call.model] ?? DEAREST;
  const input = Math.ceil((call.system.length + call.user.length) / 2);
  return Math.ceil(input * price.input + call.maxTokens * price.output);
}

export function capMicroUsd(setting: string | undefined): number {
  const usd = Number(setting);
  return Math.round(
    (Number.isFinite(usd) && usd >= 0 && setting?.trim() ? usd : DEFAULT_DAILY_CAP_USD) * 1e6,
  );
}

/** True when today's spend plus these calls at their worst stays inside the cap. */
export async function fitsCap(
  db: Sql,
  now: Date,
  cap: number,
  calls: ModelCall[],
): Promise<boolean> {
  const planned = calls.reduce((sum, call) => sum + worstCaseMicroUsd(call), 0);
  return (await spentOn(db, dayOf(now))) + planned <= cap;
}
