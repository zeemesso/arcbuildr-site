import { describe, expect, it } from "vitest";
import { normalizePhone } from "../src/lib/phone";

describe("normalizePhone", () => {
  it.each([
    ["+212 6 12 34 56 78", "+212612345678"],
    ["00212-612-345-678", "+212612345678"],
    ["+33 6.12.34.56.78", "+33612345678"],
    ["+1 (415) 555-0123", "+14155550123"],
    ["+971501234567", "+971501234567"],
  ])("accepts %s", (input, out) => expect(normalizePhone(input)).toBe(out));

  it.each(["0612345678", "+0 612 345 678", "+212 6", "+1234567890123456", "+212 6x 12 34", ""])(
    "rejects %s",
    (input) => expect(normalizePhone(input)).toBe(""),
  );
});
