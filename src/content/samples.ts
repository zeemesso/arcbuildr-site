/**
 * The words inside the five sample screens of Say It Plain (deck section 5b). The deck names the screens
 * and says they "come back from 56fccff": these are that page's own screen words, from our tests with an
 * invented owner, a bookkeeper for tradespeople (L12-P1/mvp/tests, L12-P2/lab). Three things differ from
 * that page: no date is on a screen, the seventh check reads "Sounds like you" (VERDICT-5), and the
 * profile is called by its name, with no file ending (the page holds no file names).
 * A screen is a drawing for the eye; a screen reader is told the tool's title and line instead.
 */
export const samples = {
  /** The tag on every screen. */
  tag: "Sample",
  profile: {
    source: "Your interview",
    length: "45 min",
    file: "My profile",
    rows: [
      "What I sell, and who buys it",
      "What clients say before they hire me",
      "How I talk",
      "My stories",
      "Never claim or share",
    ],
  },
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
  setup: {
    source: "Your photo",
    length: "1 photo",
    typed: "filming check",
    check: "Background",
    verdict: "OK",
    fixLabel: "The one fix that matters most",
    fix: "Turn the phone upright.",
  },
  editor: {
    source: "Your clip",
    length: "1:38",
    typed: "edit",
    head: "Cut list",
    summary: "Keeps 60.9 of 98.1 s",
    cuts: [
      { at: "00:00.0 to 00:10.8", what: "no speech", from: 0, to: 11 },
      { at: "00:13.0 to 00:13.4", what: "no speech", from: 13.3, to: 13.7 },
      { at: "00:18.7 to 00:19.5", what: "no speech", from: 19.1, to: 19.9 },
      { at: "00:20.9 to 00:35.3", what: "no speech", from: 21.3, to: 36 },
    ],
    never: "Never cut: the line you keep word for word",
  },
  files: {
    source: "New from us",
    length: "1 file",
    tag: "Add-on",
    lines: [
      { k: "Name", v: "Plan my week" },
      { k: "Adds", v: "a plan for the week's videos, in the order they film them" },
      { k: "Replaces", v: "nothing" },
    ],
    steps: ["Click Add, then Upload from device.", "Pick the new file.", "Type what's new?"],
    added: "Added",
  },
};
