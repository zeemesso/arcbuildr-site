import { timeline } from "./seasonMap";

/** The season arc as 24 steps: how many tiles high each episode sits. It rises and comes back down. */
export const heights = [
  0, 1, 2, 3, 4, 5, 5, 6, 6, 6, 7, 7, 7, 7, 6, 6, 6, 5, 5, 4, 3, 2, 1, 0,
] as const;
export const arcRows = Math.max(...heights) + 1;

const end = timeline[timeline.length - 1].at;
const column = (tile: number) => Math.min(Math.max(tile, 1), heights.length) - 1;
const percent = (at: number) => `${Number(((at / end) * 100).toFixed(2))}%`;

/** When each tile fills in, as a share of the walk (0 to 1). */
export const fillAt = heights.map(
  (_, i) => (timeline.find((step) => step.tile === i + 1)?.at ?? end) / end,
);
/** The share of the walk he waits on the first tile before setting off. */
export const setOff = (timeline.find((step) => step.tile === 1)?.at ?? 0) / end;
/**
 * Walk length in milliseconds, and how many leg cycles fit in the moving part.
 * With the costume change in front it stays under 5 seconds, so the motion needs no pause control.
 */
export const walkMs = 4400;
export const cycleMs = 480;
export const cycles = Number(((walkMs * (1 - setOff)) / cycleMs).toFixed(2));

/** Keyframes for one outfit. Names differ per outfit so a new pick restarts every animation. */
export function seasonKeyframes(id: string): string {
  const position = timeline
    .map((step) => {
      const c = column(step.tile);
      return `${percent(step.at)}{transform:translate(${c * 100}%,${-heights[c] * 100}%)}`;
    })
    .join("");
  const count = timeline
    .map((step) => `${percent(step.at)}{--ep:${step.written};--day:${step.day}}`)
    .join("");
  return [
    `@keyframes pos-${id}{${position}}`,
    `@keyframes count-${id}{${count}}`,
    `@keyframes fill-${id}{from{background-color:var(--tile-empty);box-shadow:inset 0 0 0 var(--px) var(--tile-edge)}}`,
    `@keyframes still-${id}{from{background-position-x:0}}`,
    `@keyframes cycle-${id}{from{background-position-x:calc(-64px*var(--s))}to{background-position-x:calc(-192px*var(--s))}}`,
    `@keyframes appear-${id}{from{opacity:0}}`,
    `@keyframes poof-${id}{from{background-position-x:0}to{background-position-x:calc(-192px*var(--s))}}`,
  ].join("");
}

/** The custom properties that point one outfit at its keyframes. */
export function seasonNames(id: string, costume: boolean): string {
  return [
    `--k-pos:pos-${id}`,
    `--k-count:count-${id}`,
    `--k-fill:fill-${id}`,
    `--k-still:still-${id}`,
    `--k-cycle:cycle-${id}`,
    `--k-appear:${costume ? `appear-${id}` : "none"}`,
    `--k-poof:${costume ? `poof-${id}` : "none"}`,
    `--lead:${costume ? "0.55s" : "0s"}`,
  ].join(";");
}
