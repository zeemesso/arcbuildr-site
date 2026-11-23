/**
 * The page's words, as the copy deck wrote them. `deck.json` is made by `node scripts/deck/sync.mjs`
 * and is never edited by hand. A component asks for a slot by the name the deck gave it; a slot the deck
 * no longer has stops the build, so a renamed line is noticed.
 */
import data from "./deck.json" with { type: "json" };

type Slot = [name: string, words: string];
const sections = data.sections as unknown as Record<string, { title: string; slots: Slot[] }>;

/**
 * A visual that must be a real thing of Zyade's own: a piece from his account ([CLIENT ZERO: ...]) or his
 * own audit ([ZYADE'S AUDIT: ...]). The words inside are a note to the build, never shown.
 */
const CLIENT_ZERO = /\s*\[(?:CLIENT ZERO|ZYADE'S AUDIT):[^\]]*\]/g;

const named = (slot: string) => sections.names?.slots.find(([name]) => name === slot)?.[1] ?? "";
/** The digital product's name. The deck writes it once and puts `{product}` everywhere else. */
export const PRODUCT = named("product name");
/** The three packages' names, written once too: `{p12}`, `{p24}` and `{p36}` in a line. */
export const PACKAGES = {
  p12: named("package 1 name"),
  p24: named("package 2 name"),
  p36: named("package 3 name"),
};
const NAMES: Record<string, string> = { product: PRODUCT, ...PACKAGES };

/** A slot's words as the page shows them: the note of a real-piece slot off, the names in. */
const shown = (words: string) =>
  words
    .replace(CLIENT_ZERO, "")
    // `{name}` is the visitor's first name: the form fills it, not the deck.
    .replace(/\{(product|p12|p24|p36)\}/g, (_, key: string) => {
      if (!NAMES[key]) throw new Error(`deck: no name for {${key}}`);
      return NAMES[key];
    })
    .trim();

/** A section by its number, or a part of the last section by its heading ("the booked page"). */
export function section(key: number | string) {
  const found = sections[String(key)];
  if (!found) throw new Error(`deck: no section "${key}"`);
  const { slots } = found;
  const find = (name: string) => slots.find(([slot]) => slot === name)?.[1];
  return {
    /** The words of one slot. */
    get(name: string): string {
      const words = find(name);
      if (words === undefined) throw new Error(`deck: section "${key}" has no slot "${name}"`);
      return shown(words);
    },
    /** The same, or nothing when the deck has no such slot. */
    find: (name: string) => {
      const words = find(name);
      return words === undefined ? undefined : shown(words);
    },
    /** Every slot whose name starts with `prefix`, in the deck's order. */
    list: (prefix: string) =>
      slots
        .filter(([slot]) => slot.startsWith(prefix))
        .map(([slot, words]) => ({ slot, words: shown(words) })),
    /** True when the slot is, or holds, a real-piece visual. */
    isProof: (name: string) => /\[CLIENT ZERO:/.test(find(name) ?? ""),
  };
}

/** A piece of a slot's own words, used again inside a screen. Stops the build if the deck no longer says it. */
export function excerpt(words: string, piece: string) {
  if (!words.includes(piece)) throw new Error(`deck: "${piece}" is no longer in: ${words}`);
  return piece;
}
