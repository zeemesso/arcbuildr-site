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
 *   .json                                   shown as live text; the shapes are in src/content/proof.ts
 *   .md or .txt                             one paragraph per line of the script, the message or the gallery piece
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  "setup-checklist",
  "review",
  "monday-message",
  "ai-coach",
  "client-area",
];
const GALLERY = [1, 2, 3, 4].flatMap((tab) => [1, 2, 3].map((n) => `gallery-${tab}-${n}`));
const SLOTS = [...CARDS, ...GALLERY, "script-1-full"];
const PHOTO = "founder-photo";
/** Slots whose words can come from a plain text file: one paragraph is one line. */
const LINES = ["script-1", "script-1-full", "monday-message"];
const PICTURE = [".png", ".jpg", ".jpeg", ".webp", ".avif"];

if (!existsSync(index)) {
  console.log(`No pieces yet: ${index} does not exist. Nothing was changed.`);
  console.log(`Slots filled: ${filledNow()} of ${SLOTS.length}.`);
  process.exit(0);
}

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

for (const row of rows(readFileSync(index, "utf8"))) {
  const slot = row.slot.toLowerCase();
  const source = resolve(dirname(index), row.file);
  const kind = extname(source).toLowerCase();
  const skip = (why) => left.push(`${row.slot} (${row.file}): ${why}`);
  if (row.personal) skip("marked personal");
  else if (slot !== PHOTO && !SLOTS.includes(slot)) skip("not a slot of the page");
  else if (!existsSync(source)) skip("the file is not there");
  else if (PICTURE.includes(kind)) {
    const name = slot === PHOTO ? `founder${kind}` : `${slot}${kind}`;
    copy(source, join(PICTURES, name));
    const picture = { image: `/proof/${name}`, alt: row.caption, ...size(source) };
    write(join(DATA, `${slot}.json`), JSON.stringify(picture, null, 2) + "\n");
    placed.push(`${slot}: picture`);
  } else if (slot === PHOTO) skip("his photo must be a picture");
  else if (kind === ".json") {
    try {
      const data = JSON.parse(readFileSync(source, "utf8"));
      // A picture named inside the piece comes along, under the slot's own name.
      for (const key of ["image", "still", "frame"]) {
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
    else if (LINES.includes(slot)) {
      write(join(DATA, `${slot}.json`), JSON.stringify({ lines: paragraphs }, null, 2) + "\n");
      placed.push(`${slot}: live text`);
    } else if (GALLERY.includes(slot)) {
      const data = { title: row.caption || undefined, text: paragraphs };
      write(join(DATA, `${slot}.json`), JSON.stringify(data, null, 2) + "\n");
      placed.push(`${slot}: live text`);
    } else skip("this slot takes a picture or a .json file (see src/content/proof.ts)");
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
