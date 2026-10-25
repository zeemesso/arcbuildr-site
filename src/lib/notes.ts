import { getCollection, type CollectionEntry } from "astro:content";
import buildInfo from "../generated/build-info.json";

export type Note = CollectionEntry<"notes">;

// Same rule as Base.astro: unknown branch counts as main, so drafts stay out.
export const showDrafts = !["main", "unknown", ""].includes(buildInfo.branch);

/** Notes for this build, newest first. Drafts only on preview branches. */
export async function getNotes(): Promise<Note[]> {
  const all = await getCollection("notes", ({ data }: Note) => showDrafts || !data.draft);
  return all.sort((a: Note, b: Note) => b.data.date.getTime() - a.data.date.getTime());
}

/** Non-draft notes only, for the sitemap. */
export async function getPublishedNotes(): Promise<Note[]> {
  return (await getNotes()).filter((n) => !n.data.draft);
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export const readMinutes = (body: string | undefined) =>
  Math.max(1, Math.round((body ?? "").split(/\s+/).filter(Boolean).length / 200));
