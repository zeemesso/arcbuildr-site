// Draws the pixel character and writes the sprite sheets into public/sprites/.
// Every pixel is placed by hand in the grids below. Run: node scripts/sprites/build.mjs
// Add --preview <dir> to also write enlarged previews (kept out of the repo).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Canvas } from "./png.mjs";

export const CELL = { width: 32, height: 48 };
/** Column order in every row of the sheet. */
export const FRAMES = ["idle-a", "idle-b", "walk-a", "walk-b", "walk-c", "walk-d", "thumb"];
/** Row order in the sheet. */
export const OUTFITS = ["own", "anime", "scifi", "western", "detective"];

const SKIN = { s: "#d8a071", S: "#b97f55", n: "#b97f55", l: "#e9bd92" };
const HAIR = { h: "#2b1d16", H: "#5c4434", k: "#1a110c", m: "#33231a", M: "#6e4c38" };
const FACE = { e: "#20140e", o: "#b0685a" };

const PALETTES = {
  // His own clothes: black crew-neck T-shirt, the bag strap, jeans, white trainers.
  own: {
    ...SKIN,
    ...HAIR,
    ...FACE,
    t: "#232326",
    T: "#141416",
    a: "#232326",
    f: SKIN.s,
    d: SKIN.s,
    D: SKIN.S,
    j: "#4a5670",
    J: "#373f55",
    x: "#e8722e",
    X: "#b4521c",
    r: "#a34945",
  },
  // Sci-fi: a sage flight suit, pale collar ring, gloves and boots, a pack with an antenna.
  scifi: {
    ...SKIN,
    ...HAIR,
    ...FACE,
    t: "#5f7b5d",
    T: "#4a614a",
    a: "#5f7b5d",
    f: "#5f7b5d",
    d: "#8c7b6b",
    D: "#6f6154",
    j: "#5f7b5d",
    J: "#4a614a",
    x: "#2f2f33",
    X: "#141416",
    g: "#9fb4b8",
    c: "#d3cbbd",
    C: "#8c7b6b",
    u: "#8c7b6b",
    U: "#6f6154",
    O: "#e8722e",
    w: "#ffffff",
  },
  // Anime: a short clay jacket with cream trim over an ink shirt, an orange scarf whose tail flies behind him.
  anime: {
    ...SKIN,
    ...HAIR,
    ...FACE,
    t: "#a34945",
    T: "#7f3835",
    a: "#a34945",
    f: "#a34945",
    d: SKIN.s,
    D: SKIN.S,
    j: "#8c7b6b",
    J: "#6f6154",
    x: "#2f2f33",
    X: "#141416",
    c: "#f1eadd",
    C: "#cfc4b2",
    i: "#2f2f33",
    O: "#e8722e",
    R: "#b4521c",
  },
  // Western: a wide taupe hat with an orange band, a cream shirt, an open vest, a clay bandana, boots.
  western: {
    ...SKIN,
    ...HAIR,
    ...FACE,
    t: "#f1eadd",
    T: "#cfc4b2",
    a: "#f1eadd",
    f: "#f1eadd",
    d: SKIN.s,
    D: SKIN.S,
    j: "#4a5670",
    J: "#373f55",
    x: "#6e4c38",
    X: "#4a3324",
    v: "#8c7b6b",
    V: "#6f6154",
    b: "#a34945",
    B: "#7f3835",
    y: "#5c4434",
    O: "#e8722e",
  },
  // Detective: a long slate coat with the collar up, cream buttons and belt, a brimmed hat with an orange band.
  detective: {
    ...SKIN,
    ...HAIR,
    ...FACE,
    t: "#3d4250",
    T: "#2b2f3a",
    a: "#3d4250",
    f: "#3d4250",
    d: SKIN.s,
    D: SKIN.S,
    j: "#232326",
    J: "#141416",
    x: "#33231a",
    X: "#1a110c",
    c: "#f1eadd",
    C: "#cfc4b2",
    q: "#2f2f33",
    Q: "#1c1c20",
    O: "#e8722e",
  },
};

// 18 x 18. Curly hair with volume, two ringlets on the forehead, thick brows,
// a thin moustache and a chin beard.
const HEAD = [
  "......hh..hhh.....",
  "...hhhhhhhhhhhhh..",
  "..hhHhhkhHhhhhHhh.",
  ".hhhhhhHhhhkHhhhhh",
  ".hHhhkhhhhHhhhhhHh",
  "hhhhhHhhhhhhhkHhhh",
  "hhHhhhhhhhsssshhhh",
  "hhhhhhhshsssssshHh",
  ".hhHhhskkssskkshhh",
  ".hhhhhsssssssssshh",
  "..hhhSssessssessh.",
  "...hhSssessSsessS.",
  "....hSsssssSSssss.",
  ".....SsssMMMMssS..",
  ".....Sssssoossss..",
  "......SsssmmsssS..",
  ".......SmmmmmmS...",
  ".........mmmm.....",
];

// 16 wide. The torso without arms; arms are drawn apart so they can swing.
const TORSO = [
  "......nnnn......",
  "..tttttnnttttt..",
  "...tttttttttt...",
  "...tttttttttt...",
  "...tttttttttT...",
  "...tttttttttT...",
  "...tttttttttT...",
  "...tttttttttT...",
  "...tttttttttT...",
  "...tttttttttT...",
];
const ARM = ["aa", "aa", "aa", "ff", "ff", "ff", "dd"];

const LEGS = {
  stand: [
    "...jjjjjjjjjj...",
    "...jjjjjjjjjj...",
    "...jjjjjjjjjj...",
    "...jjjjj.jjjj...",
    "...jjjj..jjjj...",
    "...jjjj..jjjj...",
    "...jjjj..jjjj...",
    "...jjjj..jjjj...",
    "...jjjj..jjjj...",
    "...jjjj..jjjj...",
    "...xxxxx.xxxxx..",
    "...XXXXX.XXXXX..",
  ],
  // Near leg forward, far leg back.
  "walk-a": [
    "...jjjjjjjjjj...",
    "...jjjjjjjjjj...",
    "...JJjjjjjjjj...",
    "..JJJJ.jjjjjj...",
    "..JJJJ..jjjjj...",
    ".JJJJ....jjjjj..",
    ".JJJJ....jjjjj..",
    ".JJJ......jjjj..",
    "JJJJ......jjjjj.",
    "JJJ........jjjj.",
    "xxX........xxxxx",
    ".XX........XXXXX",
  ],
  // Near leg planted, far leg passing.
  "walk-b": [
    "...jjjjjjjjjj...",
    "...jjjjjjjjjj...",
    "....jjjjjJJJ....",
    "....jjjjjJJJJ...",
    "....jjjj.JJJJ...",
    "....jjjj..JJJ...",
    "....jjjj.JJJ....",
    "....jjjjJJJ.....",
    "....jjjjxX......",
    "....jjjj........",
    "....xxxxx.......",
    "....XXXXX.......",
  ],
  // Far leg forward, near leg back.
  "walk-c": [
    "...jjjjjjjjjj...",
    "...jjjjjjjjjj...",
    "...jjjjjjJJJJ...",
    "..jjjjj.JJJJJ...",
    "..jjjj...JJJJ...",
    ".jjjj.....JJJJ..",
    ".jjjj.....JJJJ..",
    ".jjj.......JJJ..",
    "jjjj.......JJJJ.",
    "jjj.........JJJ.",
    "xxX.........xxxx",
    ".XX.........XXXX",
  ],
  // Far leg planted, near leg passing.
  "walk-d": [
    "...jjjjjjjjjj...",
    "...jjjjjjjjjj...",
    "....JJJJjjjj....",
    "....JJJJjjjjj...",
    "....JJJJ.jjjj...",
    "....JJJJ..jjj...",
    "....JJJJ.jjj....",
    "....JJJJjjj.....",
    "....JJJjxx......",
    "....JJJJ........",
    "....xxxxx.......",
    "....XXXXX.......",
  ],
};

// The raised arm of the thumbs-up, placed in cell coordinates.
const THUMB_ARM = {
  x: 2,
  y: 17,
  rows: [
    "...dd....",
    "...dd....",
    ".dddd....",
    ".DDDd....",
    ".dddd....",
    ".DDDd....",
    "..ff.....",
    "..ff.....",
    "..ff.....",
    "..fff....",
    "...ffaaa.",
    "....aaaaa",
    ".....aaaa",
  ],
};

/** bob: head and torso drop by this many pixels. near/far: how far the forearm swings. */
const POSES = {
  "idle-a": { legs: "stand", bob: 0, near: 0, far: 0 },
  "idle-b": { legs: "stand", bob: 1, near: 0, far: 0 },
  "walk-a": { legs: "walk-a", bob: 1, near: -1, far: 1 },
  "walk-b": { legs: "walk-b", bob: 0, near: 0, far: 0 },
  "walk-c": { legs: "walk-c", bob: 1, near: 1, far: -1 },
  "walk-d": { legs: "walk-d", bob: 0, near: 0, far: 0 },
  thumb: { legs: "stand", bob: 0, near: null, far: 0 },
};

const HEAD_AT = { x: 7, y: 8 };
const BODY_AT = { x: 8, y: 26 };
const LEGS_AT = { x: 8, y: 36 };

function arm(canvas, x, y, swing, palette) {
  ARM.forEach((row, i) => canvas.put(x + (i >= 3 ? swing : 0), y + i, [row], palette));
}

const EXTRAS = {
  own(canvas, bx, by, palette) {
    // The bag strap over one shoulder.
    for (let i = 1; i <= 7; i++) canvas.put(bx + 4, by + i, ["r"], palette);
    canvas.put(bx + 3, by + 1, ["r"], palette);
  },
  scifi(canvas, bx, by, palette, frame) {
    // The pack, behind the near shoulder.
    if (frame !== "thumb") canvas.put(bx - 1, by + 1, ["uu", "uU", "uU", "uU", "UU"], palette);
    // Collar ring, chest arc, belt.
    canvas.put(bx + 3, by, ["cccccccccc", ".CCCCCCCC."], palette);
    canvas.put(bx + 6, by + 3, [".OO.", "O..O"], palette);
    canvas.put(bx + 3, by + 8, ["uuuuOOuuuU"], palette);
  },
  anime(canvas, bx, by, palette, frame) {
    // Cream trim down the front and along the hem; the ink shirt shows below the short jacket.
    for (let i = 2; i <= 6; i++) canvas.put(bx + 8, by + i, ["c"], palette);
    canvas.put(bx + 3, by + 7, ["cccccccccC", "iiiiiiiiii", "iiiiiiiiii"], palette);
    // The scarf, wrapped once. Its tail lifts and drops behind him as he walks.
    canvas.put(bx + 4, by, ["OOOOOOOO", ".ROOOOR."], palette);
    const up = frame === "walk-a" || frame === "walk-b" || frame === "idle-b";
    if (up) canvas.put(bx - 3, by - 2, ["OO.....", "ROOOO..", "..RROOO", ".....RO"], palette);
    else canvas.put(bx - 3, by, [".....OO", "..OOOOR", "OOORR..", "RR....."], palette);
  },
  western(canvas, bx, by, palette) {
    // An open vest over the shirt, a bandana at the neck, a belt with a buckle.
    for (let i = 1; i <= 8; i++) {
      canvas.put(bx + 3, by + i, [i < 3 ? "vvv" : "vv"], palette);
      canvas.put(bx + (i < 3 ? 10 : 11), by + i, [i < 3 ? "vvV" : "vV"], palette);
    }
    canvas.put(bx + 5, by, ["bbbbbb", ".bbbB.", "..bB.."], palette);
    canvas.put(bx + 3, by + 9, ["yyyyOOyyyy"], palette);
  },
  detective(canvas, bx, by, palette, frame) {
    // The coat reaches the knee and opens a little with the stride.
    const stride = frame === "walk-a" || frame === "walk-c";
    canvas.put(
      LEGS_AT.x,
      LEGS_AT.y,
      stride
        ? [
            "...tttttttttT...",
            "...tttttttttT...",
            "..ttttttttttT...",
            "..tttttttttttT..",
            ".ttttttttttttT..",
            ".ttttttttttttT..",
          ]
        : Array(6).fill("...tttttttttT..."),
      palette,
    );
    // Collar up, two rows of buttons, a belt.
    canvas.put(bx + 4, by - 1, ["t......t"], palette);
    canvas.put(bx + 4, by, ["tT....Tt"], palette);
    canvas.put(bx + 6, by + 3, ["c..c"], palette);
    canvas.put(bx + 6, by + 5, ["c..c"], palette);
    canvas.put(bx + 3, by + 7, ["ccccCCcccc"], palette);
  },
};

/** Drawn over the head. */
const OVER = {
  own() {},
  scifi(canvas, bx, by, palette) {
    // A glass helmet: a thin ring around the hair, open where it meets the collar, with a shine.
    const cx = bx + 7.5;
    const cy = by - 10;
    for (let y = -13; y <= 13; y++)
      for (let x = -13; x <= 13; x++) {
        const d = Math.hypot(x, y * 1.04);
        if (d >= 11.6 && d < 12.6 && cy + y < by) canvas.set(Math.round(cx + x), cy + y, palette.g);
      }
    canvas.put(bx + 1, by - 19, ["..ww", ".w..", "w..."], palette);
    canvas.put(bx + 15, by - 3, ["w"], palette);
  },
  anime() {},
  western(canvas, bx, by, palette) {
    // A wide hat, dented at the top. His curls show under the brim.
    canvas.put(
      bx - 4,
      by - 23,
      [
        "........vvvv.vvvv.......",
        ".......vvvvvvvvvvvV.....",
        ".......vvvvvvvvvvvV.....",
        ".......vvvvvvvvvvvV.....",
        ".......vvvvvvvvvvvV.....",
        ".......OOOOOOOOOOOO.....",
        "vv..vvvvvvvvvvvvvvvv..vV",
        ".vvvvvvvvvvvvvvvvvvvvvV.",
        "...VVVVVVVVVVVVVVVVVV...",
      ],
      palette,
    );
  },
  detective(canvas, bx, by, palette) {
    // A brimmed hat, pinched at the crown.
    canvas.put(
      bx - 2,
      by - 22,
      [
        "......qqqqqqqq......",
        ".....qqqqqqqqqQ.....",
        "....qqqqqqqqqqqQ....",
        "....qqqqqqqqqqqQ....",
        "....OOOOOOOOOOOO....",
        "qqqqqqqqqqqqqqqqqqqQ",
        ".QQQQQQQQQQQQQQQQQQ.",
      ],
      palette,
    );
  },
};

function drawFrame(outfit, frame) {
  const palette = PALETTES[outfit];
  const pose = POSES[frame];
  const canvas = new Canvas(CELL.width, CELL.height);
  const by = BODY_AT.y + pose.bob;
  arm(canvas, BODY_AT.x + 13, by + 2, pose.far, palette);
  canvas.put(LEGS_AT.x, LEGS_AT.y, LEGS[pose.legs], palette);
  canvas.put(BODY_AT.x, by, TORSO, palette);
  EXTRAS[outfit](canvas, BODY_AT.x, by, palette, frame);
  canvas.put(HEAD_AT.x, HEAD_AT.y + pose.bob, HEAD, palette);
  OVER[outfit](canvas, BODY_AT.x, by, palette);
  if (pose.near === null) canvas.put(THUMB_ARM.x, THUMB_ARM.y, THUMB_ARM.rows, palette);
  else arm(canvas, BODY_AT.x + 1, by + 2, pose.near, palette);
  if (outfit === "scifi" && pose.near !== null) {
    canvas.put(BODY_AT.x + 1, by + 3, ["OO"], palette);
  }
  return canvas;
}

/** The costume change: a burst that hides him for a moment, then scatters. 6 frames. */
function drawPoof() {
  const colors = { w: "#ffffff", c: "#ebe3d6", o: "#e8722e", u: "#b3a592" };
  const sheet = new Canvas(CELL.width * 6, CELL.height);
  const cx = 16;
  const cy = 30;
  let seed = 7;
  const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const star = (canvas, ox, x, y, size, color) => {
    for (let i = -size; i <= size; i++) {
      canvas.set(ox + x + i, y, color);
      canvas.set(ox + x, y + i, color);
    }
  };
  const cloud = (ox, circles) => {
    const inside = (x, y) =>
      circles.some(([dx, dy, r]) => (x - cx - dx) ** 2 + (y - cy - dy) ** 2 <= r * r + r * 0.5);
    for (let y = 0; y < CELL.height; y++)
      for (let x = 0; x < CELL.width; x++) {
        if (!inside(x, y)) continue;
        const edge =
          !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        const shade = inside(x - 2, y - 2) && !inside(x + 3, y + 3);
        sheet.set(ox + x, y, edge ? colors.u : shade ? colors.c : colors.w);
      }
  };
  // 0: a spark. 1: a small cloud. 2: the full cloud. 3: it breaks. 4 and 5: specks fly out.
  star(sheet, 0, cx, cy, 2, colors.o);
  star(sheet, 0, cx, cy, 1, colors.w);
  cloud(CELL.width, [
    [-3, -3, 5],
    [4, -1, 5],
    [0, 4, 5],
  ]);
  star(sheet, CELL.width, cx - 11, cy - 10, 1, colors.o);
  star(sheet, CELL.width, cx + 11, cy + 6, 1, colors.o);
  cloud(CELL.width * 2, [
    [0, -15, 6],
    [-6, -9, 7],
    [6, -8, 7],
    [-7, 1, 7],
    [7, 2, 7],
    [0, -2, 8],
    [-5, 10, 6],
    [5, 11, 6],
  ]);
  star(sheet, CELL.width * 2, cx + 12, cy - 19, 2, colors.o);
  star(sheet, CELL.width * 2, cx - 13, cy + 13, 1, colors.o);
  for (const [dx, dy, r] of [
    [-8, -12, 4],
    [7, -14, 3],
    [9, 0, 4],
    [-9, 4, 3],
    [1, 13, 3],
  ])
    cloud(CELL.width * 3, [[dx, dy, r]]);
  star(sheet, CELL.width * 3, cx + 13, cy - 20, 1, colors.o);
  star(sheet, CELL.width * 3, cx - 14, cy - 4, 1, colors.o);
  for (const [frame, count, reach] of [
    [4, 14, 15],
    [5, 8, 17],
  ])
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + random();
      const x = Math.round(cx + Math.cos(angle) * reach * (0.7 + random() * 0.3) * 0.8);
      const y = Math.round(cy + Math.sin(angle) * reach * (0.7 + random() * 0.3));
      const color = i % 3 === 0 ? colors.o : i % 3 === 1 ? colors.u : colors.c;
      sheet.set(CELL.width * frame + x, y, color);
      if (frame === 4) sheet.set(CELL.width * frame + x + 1, y, color);
    }
  return sheet;
}

export function buildSheet() {
  const sheet = new Canvas(CELL.width * FRAMES.length, CELL.height * OUTFITS.length);
  OUTFITS.forEach((outfit, row) =>
    FRAMES.forEach((frame, column) =>
      sheet.blit(drawFrame(outfit, frame), column * CELL.width, row * CELL.height),
    ),
  );
  return sheet;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const out = join(root, "public", "sprites");
  mkdirSync(out, { recursive: true });
  const sheet = buildSheet();
  const poof = drawPoof();
  writeFileSync(join(out, "zyade.png"), sheet.png());
  writeFileSync(join(out, "poof.png"), poof.png());
  console.log(`zyade.png ${sheet.width}x${sheet.height}, poof.png ${poof.width}x${poof.height}`);
  const at = process.argv.indexOf("--preview");
  if (at > 0) {
    const dir = process.argv[at + 1];
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "zyade-8x.png"), sheet.scaled(8, "#efede8").png());
    writeFileSync(join(dir, "zyade-3x.png"), sheet.scaled(3, "#ffffff").png());
    writeFileSync(join(dir, "poof-6x.png"), poof.scaled(6, "#efede8").png());
  }
}
