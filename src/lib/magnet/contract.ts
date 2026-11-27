// What the magnet form posts and what the Worker answers. The page script, the Worker and
// the tests all read this file, so the two sides cannot drift apart.

/** Fixed form field names. Answers to a magnet's questions use answerField(id). */
export const FIELD = {
  name: "name",
  email: "email",
  instagram: "instagram",
  phone: "phone",
  /** Checkbox: the visitor agrees that an AI model reads the answers. */
  consent: "consent",
  /** Spam trap. Hidden from people; a filled value means a bot. */
  trap: "website",
  timeZone: "tz",
  page: "page",
  utm: "utm",
  /** ReplyRail link code, when the visitor came from an Instagram message. */
  replyRail: "rr",
  sentAt: "sent_at",
  turnstile: "cf-turnstile-response",
} as const;

export const answerField = (id: string) => `q_${id}`;

/** Longest answer kept, in characters. Longer text is cut, as in the application form. */
export const MAX_LENGTH = { short: 300, long: 4000 } as const;

export const submitPath = (slug: string) => `/api/magnet/${slug}`;
export const planApiPath = (token: string) => `/api/magnet/plan/${token}`;
/** The token rides in the fragment, so it never reaches a server log or a Referer header. */
export const planPagePath = (token: string) => `/plan/#${token}`;

/** A result link token: 22 characters of base64url, 128 random bits. */
export const TOKEN = /^[A-Za-z0-9_-]{22}$/;

export type SubmitResult =
  { ok: true; url: string } | { ok: false; error: string; errors?: Record<string, string> };

/** A ReplyRail link code as it arrives in ?rr=. Anything else is dropped. */
export const LINK_CODE = /^[A-Za-z0-9_-]{6,64}$/;

/**
 * What the result page gets when it asks for a plan.
 * `html` is built by the Worker from escaped text only; the page may insert it as is.
 */
export type PlanState =
  | { status: "working" }
  | { status: "ready"; title: string; name: string; html: string }
  | { status: "unavailable"; message: string };
