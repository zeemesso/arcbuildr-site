import type { Env, MagnetJob } from "../../src/lib/env";
import { FIELD, answerField } from "../../src/lib/magnet/contract";
import type { Sql } from "../../src/lib/magnet/store";
import { memoryDb } from "./memory-db.mjs";

/** A complete, valid form for the test-sample magnet. */
export const validForm = (): Record<string, string> => ({
  [FIELD.name]: "TEST Hanane",
  [FIELD.email]: "Hanane@Example.com",
  [FIELD.instagram]: "@hanane.co",
  [FIELD.phone]: "",
  [FIELD.consent]: "on",
  [FIELD.trap]: "",
  [FIELD.timeZone]: "Africa/Casablanca",
  [FIELD.page]: "https://arcbuildr.co/m/test-sample?rr=abc12345",
  [FIELD.utm]: "utm_source=ig",
  [FIELD.replyRail]: "abc12345",
  [answerField("business")]: "Coaching for dentists who open a second clinic",
  [answerField("stuck")]:
    "I post twice a month and nobody books from it.\nI don't know what to say.",
  [answerField("posting")]: "Sometimes",
  [answerField("goal")]: "Three booked calls a week from Instagram.",
  [answerField("notes")]: "",
});

export function submit(fields: Record<string, string>, slug = "test-sample", json = true) {
  return new Request(`https://x.test/api/magnet/${slug}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(json ? { Accept: "application/json" } : {}),
    },
    body: new URLSearchParams(fields),
  });
}

/** An Env with an in-memory database and a queue that records what it was sent. */
export function magnetEnv(over: Partial<Env> = {}) {
  const sent: MagnetJob[] = [];
  const db = memoryDb() as Sql;
  const env = {
    DB: db,
    MAGNET_QUEUE: { send: async (job: MagnetJob) => void sent.push(job) },
    MAGNET_DRAFTS: "1",
    ...over,
  } as unknown as Env;
  return { env, db, sent };
}
