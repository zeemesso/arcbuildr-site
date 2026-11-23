#!/usr/bin/env node
/**
 * Brings Zyade's real pieces into the site, in one command:
 *
 *   node scripts/proof/import.mjs                 reads ~/fable-sprint/L13-P1/proof/INDEX.md
 *   node scripts/proof/import.mjs path/to/INDEX.md
 *   node scripts/proof/import.mjs --dry           says what it would do and writes nothing
 *
 * It copies, and never moves or changes, the files INDEX.md lists. They land in src/content/proof/
 * and public/proof/, which git ignores: this repository is public, so a piece is committed only after
 * Zyade approves it (git add -f <file>).
 *
 * INDEX.md is read line by line. A line places a piece when it holds a slot name and a file, either
 * as a table row with the columns `slot` and `file` (and, if wanted, `caption` and `personal`), or as
 * a list line: `- slot | file | caption`. A line marked personal is left out. Any other line is skipped.
 *
 *   picture (.png .jpg .jpeg .webp .avif)  shown as a picture of the real document; the caption is its description
 *   .md or .txt                             a gallery piece, or the piece to read in full: one paragraph per line
 *   .json                                   the same two, in the shapes of src/content/proof.ts
 *
 * A card of "What you get" takes a picture only: it shows the real document, never a drawing of it.
 *
 * Two pictures come from folders of their own, with or without an INDEX.md: his photo, the first picture
 * in ~/fable-sprint/L1-P11/photo/ (the slot `founder-photo`), and his own one-page audit, the first
 * picture in ~/fable-sprint/L1-P11/audit/ (the slot `audit`). A line of INDEX.md for either slot wins.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const dry = args.includes("--dry");
const index = resolve(
  args.find((arg) => !arg.startsWith("--")) ??
    join(homedir(), "fable-sprint/L13-P1/proof/INDEX.md"),
);
const DATA = join(root, "src/content/proof");
const PICTURES = join(root, "public/proof");

/** The slots the page has, as src/content/proof.ts names them, and his photo. */
const CARDS = [
  "brand-strategy",
  "profile",
  "visual-identity",
  "season-plan",
  "script-1",
  "filming-plan",
  "monday-message",
];
const GALLERY = [1, 2, 3, 4].flatMap((tab) => [1, 2, 3].map((n) => `gallery-${tab}-${n}`));
/** The piece to read in full. The page has had no place for it since Under the water was removed. */
const READING = "script-1-full";
const SLOTS = [...CARDS, ...GALLERY, READING];
const PHOTO = "founder-photo";
/** His own one-page audit: a picture, shown beside the audit's line and beside the two fields. */
const AUDIT = "audit";
const PICTURE = [".png", ".jpg", ".jpeg", ".webp", ".avif"];

/** The folders that hold one picture each, and the slot it fills. */
const FOLDERS = [
  [PHOTO, process.env.FOUNDER_PHOTO_DIR ?? join(homedir(), "fable-sprint/L1-P11/photo")],
  [AUDIT, process.env.AUDIT_DIR ?? join(homedir(), "fable-sprint/L1-P11/audit")],
];

const clean = (cell) =>
  cell
    .trim()
    .replace(/^`|`$/g, "")
    .replace(/^\[(.*)\]\((.*)\)$/, "$2")
    .trim();
const yes = (cell) => /^(yes|y|true|x|personal)$/i.test(cell.trim());

/** Every line of INDEX.md that names a slot and a file. */
function rows(text) {
  const found = [];
  let columns = null;
  for (const line of text.split("\n")) {
    const table = line.trim().startsWith("|");
    const cells = line
      .replace(/^\s*[-*]\s+/, "")
      .replace(/^\s*\||\|\s*$/g, "")
      .split("|")
      .map(clean);
    if (table && cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
    if (table && cells.some((cell) => /^slot$/i.test(cell))) {
      columns = cells.map((cell) => cell.toLowerCase());
      continue;
    }
    const at = (name) => (columns ? columns.findIndex((column) => column.startsWith(name)) : -1);
    const row =
      table && columns
        ? {
            slot: cells[at("slot")] ?? "",
            file: cells[at("file")] ?? cells[at("path")] ?? "",
            caption: cells[at("caption")] ?? cells[at("alt")] ?? "",
            personal: yes(cells[at("personal")] ?? ""),
          }
        : {
            slot: cells[0] ?? "",
            file: cells[1] ?? "",
            caption: cells[2] ?? "",
            personal: yes(cells[3] ?? "") || /\[personal\]/i.test(line),
          };
    if (row.slot && row.file) found.push(row);
  }
  return found;
}

/** A PNG says its own size in its first bytes; other pictures are placed without one. */
function size(path) {
  const bytes = readFileSync(path);
  if (extname(path).toLowerCase() !== ".png" || bytes.length < 24) return {};
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function filledNow() {
  return SLOTS.filter((slot) => existsSync(join(DATA, `${slot}.json`))).length;
}

const placed = [];
const left = [];
const write = (path, body) => {
  if (dry) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
};
const copy = (from, to) => {
  if (dry) return;
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
};

/** The first picture of each folder, as a row; the lines of INDEX.md come after, so they win. */
const fromFolders = FOLDERS.flatMap(([slot, folder]) => {
  if (!existsSync(folder)) return [];
  const file = readdirSync(folder)
    .filter((name) => !name.startsWith(".") && PICTURE.includes(extname(name).toLowerCase()))
    .sort()[0];
  return file ? [{ slot, file: join(folder, file), caption: "", personal: false }] : [];
});
if (!existsSync(index)) console.log(`No pieces yet: ${index} does not exist.`);
const listed = existsSync(index) ? rows(readFileSync(index, "utf8")) : [];

for (const row of [...fromFolders, ...listed]) {
  const slot = row.slot.toLowerCase();
  const source = resolve(dirname(index), row.file);
  const kind = extname(source).toLowerCase();
  const skip = (why) => left.push(`${row.slot} (${row.file}): ${why}`);
  if (row.personal) skip("marked personal");
  else if (slot !== PHOTO && slot !== AUDIT && !SLOTS.includes(slot))
    skip("not a slot of the page");
  else if (!existsSync(source)) skip("the file is not there");
  else if (PICTURE.includes(kind)) {
    const name = slot === PHOTO ? `founder${kind}` : `${slot}${kind}`;
    copy(source, join(PICTURES, name));
    const picture = { image: `/proof/${name}`, alt: row.caption, ...size(source) };
    write(join(DATA, `${slot}.json`), JSON.stringify(picture, null, 2) + "\n");
    placed.push(`${slot}: picture`);
  } else if (slot === PHOTO) skip("his photo must be a picture");
  else if (slot === AUDIT) skip("his audit must be a picture");
  else if (CARDS.includes(slot)) skip("a card takes a picture of the real document");
  else if (kind === ".json") {
    try {
      const data = JSON.parse(readFileSync(source, "utf8"));
      // A picture named inside the piece comes along, under the slot's own name.
      for (const key of ["image"]) {
        if (typeof data[key] !== "string" || data[key].startsWith("/")) continue;
        const picture = resolve(dirname(source), data[key]);
        if (!existsSync(picture)) throw new Error(`its ${key} is not there`);
        const name = `${slot}-${key}${extname(picture).toLowerCase()}`;
        copy(picture, join(PICTURES, name));
        data[key] = `/proof/${name}`;
      }
      write(join(DATA, `${slot}.json`), JSON.stringify(data, null, 2) + "\n");
      placed.push(`${slot}: live text`);
    } catch (error) {
      skip(error instanceof SyntaxError ? "not valid JSON" : error.message);
    }
  } else if (kind === ".md" || kind === ".txt") {
    const paragraphs = readFileSync(source, "utf8")
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
      .filter((paragraph) => paragraph && !paragraph.startsWith("#"));
    if (paragraphs.length === 0) skip("the file is empty");
    else if (slot === READING) {
      write(join(DATA, `${slot}.json`), JSON.stringify({ lines: paragraphs }, null, 2) + "\n");
      placed.push(`${slot}: live text`);
    } else {
      const data = { title: row.caption || undefined, text: paragraphs };
      write(join(DATA, `${slot}.json`), JSON.stringify(data, null, 2) + "\n");
      placed.push(`${slot}: live text`);
    }
  } else skip("not a picture, a .json, a .md or a .txt file");
}

console.log(`${dry ? "Would place" : "Placed"} ${placed.length}:`);
for (const line of placed) console.log(`  ${line}`);
if (left.length) {
  console.log(`Left out ${left.length}:`);
  for (const line of left) console.log(`  ${line}`);
}
if (!dry) console.log(`Slots filled: ${filledNow()} of ${SLOTS.length}.`);
console.log(
  "These folders are not in git. Build to see the pieces: npm run build && npm run preview",
);
