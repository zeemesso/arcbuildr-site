import { describe, expect, it } from "vitest";
import { leadProperties } from "../src/lib/notion";

describe("leadProperties", () => {
  it("leaves optional text empty instead of sending blank content", () => {
    const p = leadProperties({
      name: "A",
      email: "a@b.co",
      instagram: "@a",
      business: "B",
      source: "ig",
      submittedAt: "2026-10-24T00:00:00.000Z",
    });
    expect(p.Goal.rich_text).toEqual([]);
    expect(p.Referrer.rich_text).toEqual([]);
  });
});
