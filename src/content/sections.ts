export const SECTION_IDS = [
  "top",
  "problem",
  "season",
  "offer",
  "ai",
  "proof",
  "evidence",
  "fit",
  "questions",
  "apply",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];
