import { describe, expect, it } from "vitest";
import {
  wideCells,
  tallCells,
  dayAt,
  timeline,
  touches,
  point,
  walkerPoint,
  tagPoint,
  tileSize,
} from "../src/lib/seasonMap";
import { seasonMap } from "../src/content/site";
for (const [name, cells, columns] of [
  ["wide", wideCells, 18],
  ["tall", tallCells, 10],
] as const) {
  describe(name, () => {
    it("has 24 unique cells", () => expect(new Set(cells.map((c) => c.join(","))).size).toBe(24));
    it("touches its neighbours without moving left", () =>
      cells.slice(1).forEach((c, i) => {
        expect(touches(c, cells[i])).toBe(true);
        expect(c[0]).toBeGreaterThanOrEqual(cells[i][0]);
      }));
    it("mirrors itself", () =>
      cells.forEach((c, i) => expect([columns - 1 - c[0], c[1]]).toEqual(cells[23 - i])));
    it("places the walker inside the endpoints", () => {
      expect(walkerPoint(cells, 0)).toEqual([42, point(cells[0])[1] + 4]);
      expect(walkerPoint(cells, 25)).toEqual([point(cells[23])[0] - 28, point(cells[23])[1] + 4]);
    });
  });
}
it("maps the delivery days monotonically", () => {
  expect(dayAt(3)).toBe(10);
  expect(dayAt(24)).toBe(42);
  for (let k = 2; k <= 24; k++) expect(dayAt(k)).toBeGreaterThanOrEqual(dayAt(k - 1));
});
it("writes nothing before day 8 and preserves timeline order", () => {
  timeline.forEach((s, i) => {
    if (s.day < 8) expect(s.written).toBe(0);
    if (s.written > 0) expect(s.day).toBeGreaterThanOrEqual(8);
    if (i) {
      expect(s.at).toBeGreaterThan(timeline[i - 1].at);
      expect(s.day).toBeGreaterThanOrEqual(timeline[i - 1].day);
    }
  });
  expect(timeline.find((s) => s.tile === 3)).toEqual({ at: 1400, tile: 3, day: 10, written: 3 });
  expect(timeline.find((s) => s.tile === 4)!.at).toBeGreaterThanOrEqual(2400);
  expect(timeline.at(-1)).toMatchObject({ day: 42, written: 24 });
});
it("uses whole grid units", () => {
  expect(point([2, 3])).toEqual([70, 104]);
});

it.each(wideCells.map((_, i) => i + 1))(
  "keeps the full episode %i tag inside the arch with clearance",
  (mark) => {
    const [x, y] = tagPoint(wideCells, mark);
    const halfWidth = (`${seasonMap.tag} ${mark}`.length * 12.5) / 2;
    const left = x - halfWidth,
      right = x + halfWidth,
      top = y - 11,
      bottom = y + 11;
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(612);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(bottom).toBeLessThanOrEqual(306);
    for (const cell of wideCells) {
      const [tx, ty] = point(cell);
      expect(
        right <= tx - 8 ||
          left >= tx + tileSize + 8 ||
          bottom <= ty - 8 ||
          top >= ty + tileSize + 8,
      ).toBe(true);
    }
  },
);
