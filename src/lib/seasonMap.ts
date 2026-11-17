export type Cell = readonly [number, number];
export const wideCells: readonly Cell[] = [
  [0, 8],
  [0, 7],
  [0, 6],
  [1, 5],
  [1, 4],
  [2, 3],
  [3, 2],
  [4, 1],
  [5, 1],
  [6, 0],
  [7, 0],
  [8, 0],
  [9, 0],
  [10, 0],
  [11, 0],
  [12, 1],
  [13, 1],
  [14, 2],
  [15, 3],
  [16, 4],
  [16, 5],
  [17, 6],
  [17, 7],
  [17, 8],
];
export const tallCells: readonly Cell[] = [
  [0, 10],
  [0, 9],
  [0, 8],
  [0, 7],
  [0, 6],
  [0, 5],
  [1, 4],
  [1, 3],
  [2, 2],
  [2, 1],
  [3, 0],
  [4, 0],
  [5, 0],
  [6, 0],
  [7, 1],
  [7, 2],
  [8, 3],
  [8, 4],
  [9, 5],
  [9, 6],
  [9, 7],
  [9, 8],
  [9, 9],
  [9, 10],
];
export const pitch = 34;
export const tileSize = 30;
export const point = ([column, row]: Cell): Cell => [column * pitch + 2, row * pitch + 2];
export const touches = (a: Cell, b: Cell) =>
  Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) === 1;
export function dayAt(k: number): number {
  return k <= 3 ? 7 + k : 10 + Math.round(((k - 3) * 32) / 21);
}
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
export function walkerPoint(cells: readonly Cell[], tile: number): Cell {
  const cell: Cell =
    tile === 0
      ? [1, cells[0][1]]
      : tile === 25
        ? [cells[23][0] - 1, cells[23][1]]
        : cells[tile - 1];
  const [x, y] = point(cell);
  return [x + 6, y + 4];
}
export function tagPoint(cells: readonly Cell[], mark: number): Cell {
  const [x, y] = point(cells[mark - 1]);
  const middle = 306;
  const centerX = x + tileSize / 2;
  const tagX = mark <= 12 ? Math.min(middle, centerX + 96) : Math.max(middle, centerX - 96);
  return [tagX, Math.max(95, y + tileSize / 2)];
}
