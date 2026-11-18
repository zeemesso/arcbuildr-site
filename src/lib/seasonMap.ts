/** The day a given episode is written by: the first 3 by day 10, all 24 by day 42. */
export function dayAt(k: number): number {
  return k <= 3 ? 7 + k : 10 + Math.round(((k - 3) * 32) / 21);
}
/**
 * The season as steps in time: nothing is written in the first week, the first 3 episodes
 * arrive by day 10, the rest by day 42. `at` is a position in time, in arbitrary units.
 */
export const timeline = [
  ...Array.from({ length: 7 }, (_, i) => ({ at: i * 100, tile: 0, day: i + 1, written: 0 })),
  ...Array.from({ length: 24 }, (_, i) => {
    const tile = i + 1;
    return {
      at: tile <= 3 ? 700 + i * 350 : 2400 + (tile - 3) * 170,
      tile,
      day: dayAt(tile),
      written: tile,
    };
  }),
  { at: 6200, tile: 25, day: 42, written: 24 },
];
