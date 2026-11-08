/**
 * International phone number to "+<country code><number>", or "" if it isn't one.
 * Accepts a leading + or 00, then 8 to 15 digits (E.164), with spaces, dots, dashes or brackets.
 */
export function normalizePhone(input: string): string {
  const compact = input
    .trim()
    .replace(/[\s().-]/g, "")
    .replace(/^00/, "+");
  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : "";
}
