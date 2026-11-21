/**
 * Real pieces of Zyade's own Season One ("client zero"). Each visual marked [CLIENT ZERO: ...] in the copy
 * deck reads one piece here. A piece is a JSON file in src/content/proof/, brought in by
 * `node scripts/proof/import.mjs`. That folder is not in git: this repository is public, and the pieces
 * stay out of it until Zyade approves them. A piece that is not there yet is `null`, and its slot shows
 * quiet bars. Nothing is ever invented to fill a slot.
 */
const files = import.meta.glob<unknown>("./proof/*.json", { eager: true, import: "default" });

/** Page 1 of the Brand Strategy: the paragraph and the beliefs. */
export type BrandStrategy = { knownFor: string; beliefs: string[] };
/** The public profile's fields, before and after. `pins` is the order to pin, first to last. */
export type Profile = {
  fields: { name: string; before: string; after: string }[];
  pins?: string[];
};
/** Script 1 of the season, its shot list, its card (`keep` is the line to say word for word), and a still. */
export type Script = {
  title?: string;
  lines: string[];
  shots?: string[];
  card?: string[];
  keep?: number;
  still?: string;
};
/** The colors (CSS colors), the fonts' names, and a picture of the framing direction. */
export type Look = { colors: string[]; fonts: string[]; frame?: string };
/** The season plan: for each week, one line per video. */
export type Plan = { weeks: string[][] };
/** The first sitting of the filming plan: one line per video. */
export type Filming = { videos: string[] };
/** The setup checklist, as ticked. */
export type Checklist = { items: string[] };
/** His review of one of his own videos: the notes, and a still of the video. */
export type Review = { notes: string[]; still?: string };
/** One Monday message, line by line. */
export type Message = { lines: string[] };
/** His own AI: the idea he typed, and the script it wrote. */
export type Coach = { idea: string; script: string[] };
/** His client area: each folder with the documents in it. */
export type Area = { folders: { files: string[] }[] };
/** A piece that is a picture of the real document (a path under public/proof/), with what it shows. */
export type Shot = { image: string; alt: string; width?: number; height?: number };
/** One piece of the gallery: a picture, or words shown as text. `title` names it when it opens larger. */
export type GalleryPiece = { title?: string; image?: string; alt?: string; text?: string[] };

export type Pieces = {
  "brand-strategy": BrandStrategy;
  profile: Profile;
  "script-1": Script;
  "visual-identity": Look;
  "season-plan": Plan;
  "filming-plan": Filming;
  "setup-checklist": Checklist;
  review: Review;
  "monday-message": Message;
  "ai-coach": Coach;
  "client-area": Area;
  /** The same script, to read in full (the third free thing above the waterline). */
  "script-1-full": Script;
};

export function piece<K extends keyof Pieces>(id: K): Pieces[K] | null {
  const found = files[`./proof/${id}.json`] as (Pieces[K] & Partial<Shot>) | undefined;
  // A picture of the document takes the slot instead (see `shot`).
  return found && !found.image ? found : null;
}

/** The same slot filled by a picture of the real document. */
export function shot(id: keyof Pieces): Shot | null {
  const found = files[`./proof/${id}.json`] as Partial<Shot> | undefined;
  return found?.image ? { alt: "", ...found, image: found.image } : null;
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

/** Every slot the page has for a real piece, and how many are filled. */
export const SLOTS = [
  "script-1",
  "brand-strategy",
  "profile",
  "visual-identity",
  "season-plan",
  "filming-plan",
  "setup-checklist",
  "review",
  "monday-message",
  "ai-coach",
  "client-area",
  ...[1, 2, 3, 4].flatMap((tab) => [1, 2, 3].map((n) => `gallery-${tab}-${n}`)),
  "script-1-full",
] as const;
export const filled = () => SLOTS.filter((id) => files[`./proof/${id}.json`]).length;
