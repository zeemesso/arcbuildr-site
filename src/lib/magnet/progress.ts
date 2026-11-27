import type { WorkingStep } from "./contract";

const ranges = { queued: [5, 25], reading: [25, 55], writing: [55, 92] } as const;

/** Move one point every two seconds, leaving the next milestone to the server. */
export function progressPercent(step: WorkingStep | "ready", elapsedMs = 0): number {
  if (step === "ready") return 100;
  const [start, end] = ranges[step];
  return Math.min(end - 1, start + Math.floor(Math.max(0, elapsedMs) / 2000));
}
