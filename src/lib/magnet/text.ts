// Every sentence the magnet engine shows a visitor, in one place. The form, the result page
// and the Worker read this file, so the page and the server say the same thing.
// A magnet's own words (title, questions) live in its definition, not here.

export const FORM_TEXT = {
  serious: "We read your answers before we write a word. Rushed or empty answers get nothing back.",
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
  trap: "Leave this empty",
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
  steps: {
    queued: "We got your answers.",
    reading: "Reading your answers.",
    writing: "Writing it for you.",
    ready: "It's ready.",
  },
  help: "We also email you the link. Not there in ten minutes? Check spam and promotions, or DM us at @arcbuildr.",
  readyBelow: "It's ready, right below the video.",
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
    "We read your answers and did not write anything. We only write when the answers give us enough to work with. Think we got it wrong? DM us at @arcbuildr.",
  /** Shown when writing failed on our side or is waiting for us. */
  held: "We got your answers. Writing it is taking us longer than planned. We email you the link when it's ready.",
} as const;

/** A plan message on the page: its first sentence is the headline, the rest is body text. */
export function splitMessage(message: string): { heading: string; body: string } {
  const cut = message.indexOf(". ");
  return cut === -1
    ? { heading: message, body: "" }
    : { heading: message.slice(0, cut + 1), body: message.slice(cut + 2) };
}

/** The fixed parts of every email to a lead. The lesson emails get their middle from the model. */
export const EMAIL_TEXT = {
  greeting: (name: string) => (name ? `Hi ${name},` : "Hi,"),
  linkSubject: (deliverable: string) =>
    `${deliverable.charAt(0).toUpperCase()}${deliverable.slice(1)} is ready`,
  linkBody: (deliverable: string, url: string) =>
    `We wrote ${deliverable} from your answers. Open it here:\n${url}\n\nThe link is private. Anyone who has it can read your page, so keep it to yourself.`,
  lesson: (title: string, url: string) => `Watch: ${title}\n${url}`,
  signoff: "Zyade\nArcbuildr",
  footer: (url: string) =>
    `You get these emails because you asked for this at arcbuildr.co. Stop them here: ${url}`,
} as const;

export const UNSUBSCRIBE_TEXT = {
  title: "Stop the emails",
  body: "One click and we send you nothing more. Your page stays open.",
  button: "Stop the emails",
  working: "Stopping...",
  done: "Done. You get no more emails from us.",
  badLink: "This link is not complete. Use the link at the bottom of one of our emails.",
  failure: "That didn't work. Try again, or DM us at @arcbuildr.",
} as const;
