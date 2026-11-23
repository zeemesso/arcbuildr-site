/**
 * The words inside Say It Plain's one sample screen (deck section 8b). The deck names the screen and says
 * it is "as on the 21 Nov page": these are that page's own screen words (commit 56fccff), from our tests
 * with an invented owner, a bookkeeper for tradespeople (L12-P1/mvp/tests). Two things differ from that
 * page: no date is on the screen, and the seventh check reads "Sounds like you" (VERDICT-5).
 * The screen is a drawing for the eye; a screen reader is told the three steps beside it instead.
 */
export const samples = {
  /** The tag on the screen. */
  tag: "Sample",
  script: {
    source: "Your idea",
    length: "1 line",
    idea: "why I go and get the receipts from the van",
    anglesLabel: "3 angles",
    angles: ["The tenner of copper pipe", "The box in the van", "The shoebox that works"],
    title: "Video: The tenner of copper pipe",
    openingLabel: "Opening line",
    opening: "“You think a plumber's photographing every receipt?”",
    checksLabel: "Checks before filming",
    checks: [
      "Facts",
      "Limits",
      "Stories",
      "People",
      "Opening",
      "One idea, one ask",
      "Sounds like you",
      "Only you",
      "Natural wording",
      "Length",
    ],
    result: "All 10 checks: Pass",
    ready: "Ready to film.",
  },
};
