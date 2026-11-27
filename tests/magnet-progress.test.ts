import { describe, expect, it } from "vitest";
import { progressPercent } from "../src/lib/magnet/progress";

describe("waiting page progress", () => {
  it.each([
    ["queued", 5, 25],
    ["reading", 25, 55],
    ["writing", 55, 92],
  ] as const)("%s starts at its milestone and stops before the next one", (step, start, end) => {
    expect(progressPercent(step)).toBe(start);
    expect(progressPercent(step, 2000)).toBeGreaterThan(start);
    let previous: number = start;
    for (const elapsed of [-100, 0, 999, 2000, 9999, 30_000, 60_000, 600_000, Infinity]) {
      const value = progressPercent(step, elapsed);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThan(end);
      previous = value;
    }
    expect(previous).toBe(end - 1);
  });

  it("reaches 100 immediately on ready", () => {
    expect(progressPercent("ready")).toBe(100);
    expect(progressPercent("ready", 600_000)).toBe(100);
  });
});
