import { describe, expect, it } from "vitest";
import { MAGNETS, getMagnet, visibleMagnets } from "../src/magnets/registry";
import { testSample, testSampleBrief } from "../src/magnets/test-sample";
import { checkBrief, checkDefinition, type MagnetDefinition } from "../src/magnets/types";

const live = (over: Partial<MagnetDefinition> = {}): MagnetDefinition => ({
  ...testSample,
  status: "live",
  heroVideo: { src: "/video/hero.mp4" },
  questions: Array.from({ length: 10 }, (_, i) => ({
    id: `q${i}`,
    kind: i === 0 ? ("long" as const) : ("short" as const),
    role: (["problem", "circumstance", "outcome"] as const)[i % 3]!,
    label: `Question ${i}`,
  })),
  ...over,
});

describe("checkDefinition", () => {
  it("accepts a magnet with no waiting video or with a root-relative or HTTPS source", () => {
    expect(checkDefinition(live({ waitVideo: null }))).toEqual([]);
    for (const src of ["/wait.mp4", "https://example.test/wait.mp4"])
      expect(checkDefinition(live({ waitVideo: { title: "Watch", src } }))).toEqual([]);
  });

  it.each([
    "javascript:alert(1)",
    "http://example.test/v",
    "//example.test/v",
    "/\\example.test/v",
    "/\n/example.test/v",
    "wait.mp4",
  ])("checks the waiting video title and rejects the source %j", (src) => {
    expect(checkDefinition(live({ waitVideo: { title: "  ", src } }))).toEqual([
      "test-sample: waitVideo.title is empty",
      "test-sample: waitVideo.src must be a root-relative path or HTTPS URL",
    ]);
  });

  it("accepts every magnet in the registry", () => {
    for (const magnet of MAGNETS) expect(checkDefinition(magnet)).toEqual([]);
  });

  it("keeps slugs unique", () => {
    const slugs = MAGNETS.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("accepts a complete live magnet", () => {
    expect(checkDefinition(live())).toEqual([]);
  });

  it("refuses a live magnet with no hero video", () => {
    expect(checkDefinition(live({ heroVideo: null }))).toEqual([
      "test-sample: a live magnet has a hero video",
    ]);
  });

  it("refuses a live magnet with too few questions or a missing role", () => {
    const problems = checkDefinition(live({ questions: testSample.questions }));
    expect(problems).toContain("test-sample: a live magnet has at least 10 questions");
    const noOutcome = live();
    noOutcome.questions = noOutcome.questions.map((q) => ({ ...q, role: "problem" as const }));
    expect(checkDefinition(noOutcome)).toContain(
      "test-sample: a live magnet has at least one outcome question",
    );
  });

  it("refuses a repeated or badly formed question id", () => {
    const [first] = testSample.questions;
    const problems = checkDefinition({
      ...testSample,
      questions: [first!, first!, { ...first!, id: "Bad Id" }],
    });
    expect(problems).toContain('test-sample: question id "business" is used twice');
    expect(problems).toContain(
      'test-sample: question id "Bad Id" must be lower-case letters, digits or underscores',
    );
  });

  it("refuses a choice question with one option, a bad slug, keyword or link", () => {
    const problems = checkDefinition({
      ...testSample,
      slug: "Bad Slug",
      keyword: "two words",
      lessons: [{ id: "a", title: "A", url: "http://example.com/a" }],
      questions: [
        ...testSample.questions,
        {
          id: "one",
          kind: "choice",
          role: "qualify",
          label: "Pick",
          options: [{ value: "a", label: "A" }],
        },
      ],
    });
    expect(problems).toContain("Bad Slug: slug must be lower-case words joined by dashes");
    expect(problems).toContain(
      "Bad Slug: keyword must be one lower-case word of 2 to 20 characters",
    );
    expect(problems).toContain('Bad Slug: "http://example.com/a" must start with https:// or /');
    expect(problems).toContain('Bad Slug: question "one" needs at least 2 options');
  });
});

describe("checkBrief", () => {
  it("accepts an optional text screening rule and flags other types in stored JSON", () => {
    expect(checkBrief({ ...testSampleBrief, screenRule: "Describe one example." })).toEqual([]);
    for (const screenRule of [null, false, 42, ["example"]])
      expect(checkBrief(JSON.parse(JSON.stringify({ ...testSampleBrief, screenRule })))).toContain(
        "screenRule must be a string",
      );
  });

  it("accepts the fixture brief", () => {
    expect(checkBrief(testSampleBrief)).toEqual([]);
  });

  it("refuses an empty outline and a length cap out of range", () => {
    expect(checkBrief({ ...testSampleBrief, outline: " ", maxWords: 50 })).toEqual([
      "outline is empty",
      "maxWords must be a whole number from 200 to 3000",
    ]);
  });

  it("TEST caps the combined brief text at 40,000 characters", () => {
    const brief = {
      ...testSampleBrief,
      outline: "x".repeat(10_000),
      knowledge: "x".repeat(10_000),
      hotRule: "x".repeat(10_000),
      followUp: { days: [1], guidance: "x".repeat(10_000) },
    };
    expect(checkBrief(brief)).toEqual([]);
    expect(checkBrief({ ...brief, screenRule: "x" })).toContainEqual(
      expect.stringContaining("at most 40,000 characters"),
    );
    expect(checkBrief({ ...brief, knowledge: brief.knowledge + "x" })).toEqual([
      expect.stringContaining("at most 40,000 characters"),
    ]);
  });
});

describe("registry", () => {
  it("finds a magnet by slug", () => {
    expect(getMagnet("test-sample")).toBe(testSample);
    expect(getMagnet("nope")).toBeUndefined();
  });

  it("hides drafts unless drafts are allowed", () => {
    expect(visibleMagnets(false).every((m) => m.status === "live")).toBe(true);
    expect(visibleMagnets(true)).toContain(testSample);
  });
});
