import Anthropic from "@anthropic-ai/sdk";
import { usageOf } from "./budget";
import type { ModelCall } from "./prompt";
import type { Usage } from "./store";

// The one place that talks to the Claude API, through the official SDK.

/**
 * How a call ended.
 * retry: the API was busy or unreachable; the same call may work later.
 * config: our key, model name or request is wrong; a person must fix it.
 * refused / cut: the model answered, and we paid for it, but the answer cannot be used.
 */
export type ModelOutcome =
  | { ok: true; text: string; usage: Usage }
  | { ok: false; kind: "retry" | "config"; error: string }
  | { ok: false; kind: "refused" | "cut"; error: string; usage: Usage };

export type ModelCaller = (call: ModelCall) => Promise<ModelOutcome>;

/** The part of the SDK client this file uses. Tests pass a stand-in. */
export type MessagesClient = { messages: Pick<Anthropic["messages"], "create"> };

/**
 * A deliverable takes one to two minutes. The request is not streamed: one JSON answer costs
 * almost no CPU to read, and CPU is the tight limit on the Workers Free plan.
 */
export const REQUEST_TIMEOUT_MS = 240_000;

export const anthropicClient = (apiKey: string): MessagesClient =>
  new Anthropic({ apiKey, maxRetries: 1, timeout: REQUEST_TIMEOUT_MS });

export const callerFor =
  (client: MessagesClient): ModelCaller =>
  async (call) => {
    let message: Anthropic.Message;
    try {
      message = await client.messages.create({
        model: call.model,
        max_tokens: call.maxTokens,
        system: call.system,
        messages: [{ role: "user", content: call.user }],
        output_config: {
          effort: call.effort,
          ...(call.schema ? { format: { type: "json_schema", schema: call.schema } } : {}),
        },
      });
    } catch (error) {
      // Most specific first. The message never holds the key.
      if (
        error instanceof Anthropic.BadRequestError ||
        error instanceof Anthropic.AuthenticationError ||
        error instanceof Anthropic.PermissionDeniedError ||
        error instanceof Anthropic.NotFoundError
      )
        return { ok: false, kind: "config", error: `claude ${error.status}: ${error.message}` };
      if (error instanceof Anthropic.APIError)
        return { ok: false, kind: "retry", error: `claude ${error.status ?? "connection"}` };
      return { ok: false, kind: "retry", error: `claude call failed: ${(error as Error).name}` };
    }

    const usage = usageOf(call.model, {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
    });
    if (message.stop_reason === "refusal")
      return { ok: false, kind: "refused", error: "refused", usage };
    if (message.stop_reason !== "end_turn")
      return { ok: false, kind: "cut", error: `stopped: ${message.stop_reason}`, usage };

    const text = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    return { ok: true, text, usage };
  };
