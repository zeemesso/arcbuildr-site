import type { MagnetBrief, MagnetDefinition } from "./types";

// TEST fixture. Not a real offer and never live: it exists so the engine, the page and the
// tests have a magnet to run. Copy it to start a real one.
export const testSample: MagnetDefinition = {
  slug: "test-sample",
  status: "draft",
  title: "TEST: a sample plan built from your answers",
  forWho: "For testing the magnet engine. Not a real offer.",
  deliverableName: "your sample plan",
  intro: "Answer a few questions. The engine writes a short plan from what you typed.",
  minutes: 2,
  heroVideo: null,
  waitVideo: null,
  lessons: [],
  questions: [
    {
      id: "business",
      kind: "short",
      role: "circumstance",
      label: "What do you sell, and to whom?",
      placeholder: "One line is enough.",
    },
    {
      id: "stuck",
      kind: "long",
      role: "problem",
      label: "Where are you stuck with your content right now?",
      help: "Voice-to-text works well here. Say it the way you would say it to a friend.",
    },
    {
      id: "posting",
      kind: "choice",
      role: "circumstance",
      label: "How often do you post today?",
      options: [
        { value: "Never", label: "I don't post yet" },
        { value: "Sometimes", label: "A few times a month" },
        { value: "Weekly", label: "Every week" },
      ],
    },
    {
      id: "goal",
      kind: "long",
      role: "outcome",
      label: "What should your content do for your business in the next 90 days?",
    },
    {
      id: "notes",
      kind: "short",
      role: "circumstance",
      label: "Anything else we should know? (optional)",
      required: false,
    },
  ],
  keyword: "sample",
  meta: {
    title: "TEST sample plan | Arcbuildr",
    description: "A test page for the magnet engine.",
  },
};

/** A brief for the fixture, for tests and local runs. Real briefs are never in this repo. */
export const testSampleBrief: MagnetBrief = {
  slug: "test-sample",
  outline: "## Where you are\n## The one thing to fix first\n## Three next steps",
  knowledge: "TEST notes. Keep the plan short and concrete.",
  maxWords: 300,
  hotRule: "Hot when they sell something already and post at least sometimes.",
};
