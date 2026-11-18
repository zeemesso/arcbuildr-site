import { describe, expect, it } from "vitest";
import { dayAt, timeline } from "../src/lib/seasonMap";
import {
  arcRows,
  cycleMs,
  cycles,
  fillAt,
  heights,
  seasonKeyframes,
  seasonNames,
  setOff,
  walkMs,
} from "../src/lib/arc";

describe("the season in time", () => {
  it("maps the delivery days monotonically", () => {
    expect(dayAt(3)).toBe(10);
    expect(dayAt(24)).toBe(42);
    for (let k = 2; k <= 24; k++) expect(dayAt(k)).toBeGreaterThanOrEqual(dayAt(k - 1));
  });
  it("writes nothing before day 8 and keeps its order", () => {
    timeline.forEach((s, i) => {
      if (s.day < 8) expect(s.written).toBe(0);
      if (s.written > 0) expect(s.day).toBeGreaterThanOrEqual(8);
      if (i) {
        expect(s.at).toBeGreaterThan(timeline[i - 1].at);
        expect(s.day).toBeGreaterThanOrEqual(timeline[i - 1].day);
      }
    });
    expect(timeline.find((s) => s.tile === 3)).toEqual({ at: 1400, tile: 3, day: 10, written: 3 });
    expect(timeline.at(-1)).toMatchObject({ day: 42, written: 24 });
  });
});

describe("the arc", () => {
  it("is 24 tiles that rise and come back down, one step at a time", () => {
    expect(heights).toHaveLength(24);
    expect(heights[0]).toBe(0);
    expect(heights.at(-1)).toBe(0);
    heights.forEach((h, i) => {
      expect(h).toBe(heights[23 - i]);
      if (i) expect(Math.abs(h - heights[i - 1])).toBeLessThanOrEqual(1);
    });
    expect(arcRows).toBe(Math.max(...heights) + 1);
  });
  it("fills the tiles in order, inside the walk", () => {
    expect(fillAt).toHaveLength(24);
    fillAt.forEach((at, i) => {
      expect(at).toBeGreaterThan(0);
      expect(at).toBeLessThanOrEqual(1);
      if (i) expect(at).toBeGreaterThan(fillAt[i - 1]);
    });
    expect(setOff).toBe(fillAt[0]);
  });
  it("ends within 5 seconds, costume change included, so it needs no pause control", () => {
    expect(walkMs + 550).toBeLessThan(5000);
    expect(cycles * cycleMs).toBeCloseTo(walkMs * (1 - setOff), -1);
  });
  it("names its keyframes per outfit, so a new pick restarts the walk", () => {
    const css = seasonKeyframes("western");
    for (const name of ["pos", "count", "fill", "still", "cycle", "appear", "poof"])
      expect(css).toContain(`@keyframes ${name}-western{`);
    expect(css).toContain("--ep:24;--day:42");
    expect(seasonNames("western", true)).toContain("--k-poof:poof-western");
    expect(seasonNames("own", false)).toContain("--k-poof:none");
    expect(seasonNames("own", false)).toContain("--lead:0s");
  });
});
