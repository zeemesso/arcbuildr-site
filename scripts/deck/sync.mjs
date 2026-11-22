// Copies the page's words out of the copy deck into src/content/deck.json, word for word.
// The deck is written outside this repo. Each section's words sit between <!-- copy --> and <!-- /copy -->,
// one slot per line: `slot name` then the words. Nothing here rewrites a word.
//
//   node scripts/deck/sync.mjs                 reads ~/fable-sprint/L1-P12/deck-v3.md
//   node scripts/deck/sync.mjs path/to/deck.md reads that file
//   node scripts/deck/sync.mjs --check         exits 1 when deck.json no longer matches the deck
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const check = args.includes("--check");
const given = args.find((arg) => !arg.startsWith("--"));
const source = given ?? join(homedir(), "fable-sprint", "L1-P12", "deck-v3.md");
if (!source || !existsSync(source)) {
  console.error("deck: no deck file found");
  process.exit(1);
}

/**
 * Sections by number: `## 4. The framework` is section "4". A part of a section with its own heading
 * (`### The form`) takes that heading, in small letters, as its key. The words before the first
 * heading (the product's name) are the section "names".
 */
export function parseDeck(text) {
  const sections = {};
  let key = "names";
  let title = "Names";
  let inside = false;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^##\s+(?:(\d+)\.\s+)?(.+)$/);
    const part = line.match(/^###\s+(.+)$/);
    if (heading) {
      key = heading[1] ?? heading[2].toLowerCase();
      title = heading[2];
      continue;
    }
    if (part) {
      key = part[1].toLowerCase();
      title = part[1];
      continue;
    }
    if (line === "<!-- copy -->") {
      inside = true;
      continue;
    }
    if (line === "<!-- /copy -->") {
      inside = false;
      continue;
    }
    if (!inside || !line) continue;
    const slot = line.match(/^`([^`]+)`\s+(.+)$/);
    if (!slot) throw new Error(`deck: a copy line has no slot name, in "${title}": ${line}`);
    // A name can repeat ("paragraph"): the order in the deck is the order on the page.
    sections[key] ??= { title, slots: [] };
    sections[key].slots.push([slot[1], slot[2]]);
  }
  return sections;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = fileURLToPath(new URL("../../src/content/deck.json", import.meta.url));
  const sections = parseDeck(readFileSync(source, "utf8"));
  const json = `${JSON.stringify({ deck: basename(source), sections }, null, 2)}\n`;
  const count = Object.values(sections).reduce((sum, section) => sum + section.slots.length, 0);
  if (check) {
    const same = existsSync(out) && readFileSync(out, "utf8") === json;
    console.log(
      same
        ? `deck: in sync with ${basename(source)}`
        : `deck: OUT OF SYNC with ${basename(source)}`,
    );
    process.exit(same ? 0 : 1);
  }
  writeFileSync(out, json);
  console.log(
    `deck: ${count} slots in ${Object.keys(sections).length} sections from ${basename(source)}`,
  );
}
