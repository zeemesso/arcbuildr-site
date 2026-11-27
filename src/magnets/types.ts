// A magnet is a long form in exchange for a deliverable written from the visitor's own answers.
// This file is the public half of a magnet: everything here ends up on the page.
// The private half (outline, method notes, hot-lead rule) is a MagnetBrief and lives in the
// database, never in this repo. See MAGNET-PLAN.md.

export type Option = { value: string; label: string };

/** What an answer tells us. The writer model gets this next to each answer. */
export type Role = "problem" | "circumstance" | "outcome" | "qualify";

type QuestionBase = {
  /** Stable key: lower-case letters, digits and underscores. Stored with the answer. */
  id: string;
  label: string;
  help?: string;
  placeholder?: string;
  role: Role;
  /** Defaults to true. */
  required?: boolean;
};

export type MagnetQuestion =
  | (QuestionBase & { kind: "short" })
  /** A typed paragraph. The page suggests voice-to-text. */
  | (QuestionBase & { kind: "long" })
  | (QuestionBase & { kind: "choice"; options: Option[] });

export interface MagnetDefinition {
  /** The page is /m/<slug>. */
  slug: string;
  /** Draft magnets are built on preview branches only and accept no leads in production. */
  status: "draft" | "live";
  /** The promise, used as the page heading. */
  title: string;
  /** One line: who this is for. */
  forWho: string;
  /** How the deliverable is named in sentences, e.g. "your profile plan". */
  deliverableName: string;
  /** Short text under the heading. */
  intro: string;
  /** Honest time to fill the form, in minutes. */
  minutes: number;
  /** Zyade on camera, 60 to 90 seconds. Required before a magnet goes live. */
  heroVideo: { src: string; poster?: string; caption?: string } | null;
  /** Short lesson videos the follow-up emails point to. */
  lessons: { id: string; title: string; url: string }[];
  questions: MagnetQuestion[];
  /** The word people comment or send on Instagram. ReplyRail answers with the page link. */
  keyword: string;
  meta: { title: string; description: string };
}

/** The private half of a magnet. Stored in the database, pushed from a local folder. */
export interface MagnetBrief {
  slug: string;
  /** The sections the deliverable must have, in order, as Markdown. */
  outline: string;
  /** Method notes the writer may use. */
  knowledge: string;
  /** Length cap for the deliverable, in words. */
  maxWords: number;
  /** In plain words: when a lead counts as hot. The screen step scores against it. */
  hotRule: string;
  /** The lesson emails sent after the deliverable. Leave out to send none. */
  followUp?: {
    /** Days after the deliverable, one per email, rising. Example: [1, 3, 6]. */
    days: number[];
    /** What each email teaches, in order, in plain words. */
    guidance: string;
  };
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ID = /^[a-z][a-z0-9_]{0,30}$/;
const KEYWORD = /^[a-z0-9]{2,20}$/;

/** Every problem with a definition, in plain words. An empty list means it is usable. */
export function checkDefinition(def: MagnetDefinition): string[] {
  const problems: string[] = [];
  const say = (text: string) => problems.push(`${def.slug || "(no slug)"}: ${text}`);

  if (!SLUG.test(def.slug)) say("slug must be lower-case words joined by dashes");
  for (const key of ["title", "forWho", "deliverableName", "intro"] as const)
    if (!def[key].trim()) say(`${key} is empty`);
  if (!def.meta.title.trim() || !def.meta.description.trim())
    say("meta title or description is empty");
  if (!Number.isInteger(def.minutes) || def.minutes < 1)
    say("minutes must be a whole number above 0");
  if (!KEYWORD.test(def.keyword)) say("keyword must be one lower-case word of 2 to 20 characters");

  const { questions } = def;
  if (questions.length < 3 || questions.length > 24) say("a magnet has 3 to 24 questions");
  const ids = new Set<string>();
  for (const q of questions) {
    if (!ID.test(q.id))
      say(`question id "${q.id}" must be lower-case letters, digits or underscores`);
    if (ids.has(q.id)) say(`question id "${q.id}" is used twice`);
    ids.add(q.id);
    if (!q.label.trim()) say(`question "${q.id}" has no label`);
    if (q.kind === "choice") {
      const values = q.options.map((o) => o.value);
      if (values.length < 2) say(`question "${q.id}" needs at least 2 options`);
      if (new Set(values).size !== values.length) say(`question "${q.id}" repeats an option value`);
      if (q.options.some((o) => !o.value.trim() || !o.label.trim()))
        say(`question "${q.id}" has an empty option`);
    }
  }

  const urls = [...def.lessons.map((l) => l.url), ...(def.heroVideo ? [def.heroVideo.src] : [])];
  for (const url of urls)
    if (!url.startsWith("https://") && !url.startsWith("/"))
      say(`"${url}" must start with https:// or /`);
  if (new Set(def.lessons.map((l) => l.id)).size !== def.lessons.length)
    say("a lesson id is used twice");

  // The bar for a magnet real visitors see.
  if (def.status === "live") {
    if (questions.length < 10) say("a live magnet has at least 10 questions");
    if (!questions.some((q) => q.kind === "long"))
      say("a live magnet has at least one typed paragraph question");
    for (const role of ["problem", "circumstance", "outcome"] as const)
      if (!questions.some((q) => q.role === role))
        say(`a live magnet has at least one ${role} question`);
    if (!def.heroVideo) say("a live magnet has a hero video");
  }
  return problems;
}

/** Every problem with a brief. An empty list means it is usable. */
export function checkBrief(brief: MagnetBrief): string[] {
  const problems: string[] = [];
  if (!SLUG.test(brief.slug)) problems.push("slug must be lower-case words joined by dashes");
  if (!brief.outline.trim()) problems.push("outline is empty");
  if (!brief.hotRule.trim()) problems.push("hotRule is empty");
  if (!Number.isInteger(brief.maxWords) || brief.maxWords < 200 || brief.maxWords > 3000)
    problems.push("maxWords must be a whole number from 200 to 3000");
  if (brief.followUp) {
    const { days, guidance } = brief.followUp;
    const usable =
      Array.isArray(days) &&
      days.length >= 1 &&
      days.length <= 5 &&
      days.every((day, i) => Number.isInteger(day) && day <= 30 && day > (days[i - 1] ?? 0));
    if (!usable) problems.push("followUp.days must be 1 to 5 rising whole numbers from 1 to 30");
    if (typeof guidance !== "string" || !guidance.trim())
      problems.push("followUp.guidance is empty");
  }
  return problems;
}
