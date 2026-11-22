/**
 * Real pieces of Zyade's own Season One ("client zero"). Each visual marked [CLIENT ZERO: ...] in the copy
 * deck reads one piece here. A piece is a JSON file in src/content/proof/, brought in by
 * `node scripts/proof/import.mjs`. That folder is not in git: this repository is public, and the pieces
 * stay out of it until Zyade approves them. A piece that is not there yet is `null`: a card then has
 * no picture panel, and the gallery stays off the page. Nothing is ever invented to fill a slot.
 */
const files = import.meta.glob<unknown>("./proof/*.json", { eager: true, import: "default" });

/** A real piece to read: its title and its lines, as he wrote them. */
export type Reading = { title?: string; lines: string[] };
/** A piece that is a picture of the real document (a path under public/proof/), with what it shows. */
export type Shot = { image: string; alt: string; width?: number; height?: number };
/** One piece of the gallery: a picture, or words shown as text. `title` names it when it opens larger. */
export type GalleryPiece = { title?: string; image?: string; alt?: string; text?: string[] };

/** The seven cards of "What you get", by the card's number, and the piece each one shows. */
export const CARD_PIECES = {
  "01": "brand-strategy",
  "02": "profile",
  "03": "visual-identity",
  "04": "season-plan",
  "05": "script-1",
  "06": "filming-plan",
  "07": "monday-message",
} as const;
export type CardPiece = (typeof CARD_PIECES)[keyof typeof CARD_PIECES];

/** A card's screen: a picture of the real document. Nothing until that picture exists. */
export function shot(id: CardPiece): Shot | null {
  const found = files[`./proof/${id}.json`] as Partial<Shot> | undefined;
  return found?.image ? { alt: "", ...found, image: found.image } : null;
}

/** The piece to read in full (the third free thing above the waterline). */
export function reading(): Reading | null {
  const found = files["./proof/script-1-full.json"] as Partial<Reading> | undefined;
  return found?.lines?.length ? { ...found, lines: found.lines } : null;
}

/** The gallery's pieces for one tab (1 to 4), in order. Empty until real pieces exist. */
export function gallery(tab: number): GalleryPiece[] {
  return [1, 2, 3]
    .map((n) => files[`./proof/gallery-${tab}-${n}.json`] as GalleryPiece | undefined)
    .filter((found): found is GalleryPiece => !!found && !!(found.image || found.text?.length));
}

/** His photo, when the import brought one (the slot "founder-photo"). A path under public/, or nothing. */
export const founderPhoto = () =>
  (files["./proof/founder-photo.json"] as Partial<Shot> | undefined)?.image ?? "";

/** The gallery has four tabs of three pieces. The section shows once every one of the twelve is real. */
export const GALLERY_SLOTS = [1, 2, 3, 4].flatMap((tab) => [1, 2, 3].map((n) => ({ tab, n })));
export const workIsReady = () => [1, 2, 3, 4].every((tab) => gallery(tab).length === 3);

/** Every slot the page has for a real piece, and how many are filled. */
export const SLOTS = [
  ...Object.values(CARD_PIECES),
  ...GALLERY_SLOTS.map(({ tab, n }) => `gallery-${tab}-${n}`),
  "script-1-full",
] as const;
export const filled = () => SLOTS.filter((id) => files[`./proof/${id}.json`]).length;
