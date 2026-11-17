export const SECTION_IDS = [
  "top",
  "before",
  "problem",
  "evidence",
  "method",
  "sample",
  "ai",
  "offer",
  "guarantee",
  "fit",
  "founder",
  "questions",
  "apply",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];
