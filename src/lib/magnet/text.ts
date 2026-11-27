// Every sentence the magnet engine shows a visitor, in one place. The form, the result page
// and the Worker read this file, so the page and the server say the same thing.
// A magnet's own words (title, questions) live in its definition, not here.

export const FORM_TEXT = {
  start: "Start",
  next: "Next",
  back: "Back",
  send: "Send my answers",
  sending: "Sending...",
  draft: "TEST page. Not a real offer.",
  minutes: (minutes: number) => `Takes about ${minutes} minutes.`,
  progress: (current: number, total: number) => `Question ${current} of ${total}`,
  optional: "Optional",
  voiceHint:
    "Tip: tap the microphone on your keyboard and talk. The more you tell us, the better it gets.",
  saved: "Your answers stay on this device until you send them.",
  contactTitle: "Where do we send it?",
  contactIntro: (deliverable: string) =>
    `We write ${deliverable} from your answers. It opens on the next page, and we email you the link.`,
  name: "Your name",
  email: "Email",
  emailHelp: "We send your link here, then a few short lessons. You can stop them with one click.",
  instagram: "Instagram handle",
  phone: "Phone or WhatsApp",
  phoneHelp: "Optional. With the country code.",
  consent: "I agree that Arcbuildr uses an AI model to read my answers and write this for me.",
  privacyLink: "How we handle your answers",
  privacyHref: "/privacy",
} as const;

/** Messages for a field that fails a check. The server sends the same ones. */
export const FIELD_ERROR = {
  answer: "Answer this one to continue.",
  choice: "Pick one.",
  name: "Add your name.",
  email: "Check your email address.",
  instagram: "Add your Instagram handle, like @yourname.",
  phone: "Check the number, with the country code. Or leave it empty.",
  consent: "Tick the box so we can write it.",
} as const;

/** Messages for a whole request that fails. */
export const SUBMIT_ERROR = {
  check: "Check the answers marked above.",
  badForm: "That didn't look like a form.",
  closed: "This page isn't open right now.",
  tooBig: "That was too much text for one send. Shorten your longest answer and try again.",
  duplicate:
    "We already wrote this one for that email. The link is in your inbox. Can't find it? DM us at @arcbuildr.",
  failure:
    "We couldn't send your answers. Try again, or DM us at @arcbuildr. What you typed is still here.",
} as const;

export const PLAN_TEXT = {
  workingTitle: "We're writing it now.",
  workingBody: "This takes about two minutes. Keep this page open.",
  slow: "This is taking longer than usual. You can close this page. We email you the link when it's ready.",
  kicker: (name: string) => `Written for ${name}`,
  ctaTitle: "Want us to build this with you?",
  ctaBody: "Tell us about your business. If it's a fit, we get on a call.",
  ctaButton: "Apply to work with us",
  ctaHref: "/#start",
  badLink: "This link doesn't open anything. Use the link from your email, or DM us at @arcbuildr.",
  /** Shown when the answers could not be turned into a deliverable. */
  rejected:
    "We couldn't write this from the answers we got. DM us at @arcbuildr and we'll sort it out.",
  /** Shown when writing failed on our side or is waiting for us. */
  held: "We got your answers. Writing it is taking us longer than planned. We email you the link when it's ready.",
} as const;
