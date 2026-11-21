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
/** Script 1 of the season, and a still from the video filmed from it (a path under public/proof/). */
export type Script = { title?: string; lines: string[]; still?: string };

export type Pieces = {
  "brand-strategy": BrandStrategy;
  profile: Profile;
  "script-1": Script;
};

export function piece<K extends keyof Pieces>(id: K): Pieces[K] | null {
  return (files[`./proof/${id}.json`] as Pieces[K] | undefined) ?? null;
}
