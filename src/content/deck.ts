/**
 * The home page's words, as the copy deck wrote them. `deck.json` is made by `node scripts/deck/sync.mjs`
 * and is never edited by hand. A component asks for a slot by the name the deck gave it; a slot the deck
 * no longer has stops the build, so a renamed line is noticed.
 */
import data from "./deck.json" with { type: "json" };
import { FOUNDING_PLACES_LEFT } from "../config";

type Slot = [name: string, words: string];
const sections = data.sections as unknown as Record<string, { title: string; slots: Slot[] }>;

/** A visual that must be a real piece of Zyade's own Season One. The words inside are a note, never shown. */
const CLIENT_ZERO = /\s*\[CLIENT ZERO:[^\]]*\]/g;

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
      return words.replace(CLIENT_ZERO, "").trim();
    },
    /** The same, or nothing when the deck has no such slot. */
    find: (name: string) => find(name)?.replace(CLIENT_ZERO, "").trim(),
    /** Every slot whose name starts with `prefix`, in the deck's order. */
    list: (prefix: string) =>
      slots
        .filter(([slot]) => slot.startsWith(prefix))
        .map(([slot, words]) => ({ slot, words: words.replace(CLIENT_ZERO, "").trim() })),
    /** True when the slot is, or holds, a real-piece visual. */
    isProof: (name: string) => /\[CLIENT ZERO:/.test(find(name) ?? ""),
  };
}

/** Words in [square brackets] sit in a small label. */
export function labelled(words: string) {
  return words
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("[")
        ? { label: true, text: part.slice(1, -1) }
        : { label: false, text: part },
    );
}

/** The deck writes today's count ("3 of 3"). The number left comes from src/config.ts. */
export const founding = (words: string) =>
  words.replace(/\b\d of 3\b/, `${FOUNDING_PLACES_LEFT} of 3`);

/** A piece of a slot's own words, used again inside a screen. Stops the build if the deck no longer says it. */
export function excerpt(words: string, piece: string) {
  if (!words.includes(piece)) throw new Error(`deck: "${piece}" is no longer in: ${words}`);
  return piece;
}
