/**
 * The words the copy deck does not hold. The home page, the form and the page after a booking take their
 * words from the deck (src/content/deck.ts); this file keeps the rest: names of controls, short status
 * lines, the privacy page and the not-found page. Components hold no copy of their own.
 */
import { section } from "./deck";

const head = section("title and description");
export const meta = {
  /** The deck's own title and description. */
  title: head.get("title"),
  description: head.get("description"),
  /** The link a keyboard user meets first. */
  skip: "Skip to the content",
};

/** The one action. Same words everywhere. */
export const action = "Apply and pick a time";

export const page = {
  /** The header's button, once the first button has left the screen. */
  pill: "Apply",
  /** His initials stand in the circle until a real photo of him exists. */
  founder: { initials: "ZM" },
  nav: "Sections",
  /** The three marks of the guarantee's timeline (the deck's screen note for section 10). */
  guarantee: { marks: ["Day 1", "Day 7", "Day 10"] },
  /** Names of controls for a screen reader. They are not shown. */
  ui: { pause: "Pause the gallery", close: "Close", play: "Play the video" },
};

export type Question = { id: string; q: string; err: string } & (
  { type: "link" | "long"; ph: string } | { type: "choice"; options: string[] }
);
/** The form's questions, hints and choices are the deck's ("The form"). The deck lists choices as "A. B. C." */
const form = section("the form");
const choices = (id: string) => form.get(`${id}, choices`).replace(/\.$/, "").split(". ");
const budgets = choices("budget");

export const application = {
  label: "Application",
  hi: form.get("greeting"),
  hiPrep: "Hi {name}. 8 questions, about 3 minutes.",
  again: "Welcome back. Your answers are still here.",
  next: "Next",
  finish: "Save and pick a time",
  finishPrep: "Save my answers",
  back: "Back",
  close: "Close. Your answers are kept.",
  progress: "Questions answered",
  of: "of",
  enter: "or press Enter",
  /** A field people never see. Only a program fills it. */
  trap: "Leave this field empty",
  who: [
    { id: "name", q: form.get("name"), ph: "Name", err: "Add your name." },
    { id: "email", q: form.get("email"), ph: "Email", err: "Check your email address." },
  ],
  questions: [
    {
      id: "profile",
      q: form.get("profile"),
      type: "link",
      ph: form.get("profile, hint"),
      err: "Add a link to your profile, or your handle.",
    },
    {
      id: "sell",
      q: form.get("sell"),
      type: "long",
      ph: form.get("sell, hint"),
      err: "A few words are enough.",
    },
    {
      id: "stranger",
      q: form.get("stranger"),
      type: "long",
      ph: form.get("stranger, hint"),
      err: "A few words are enough.",
    },
    { id: "film", q: form.get("film"), type: "choice", options: choices("film"), err: "Pick one." },
    {
      id: "count",
      q: form.get("count"),
      type: "choice",
      options: choices("count"),
      err: "Pick one.",
    },
    {
      id: "decides",
      q: form.get("decides"),
      type: "choice",
      options: choices("decides"),
      err: "Pick one.",
    },
    {
      id: "start",
      q: form.get("start"),
      type: "choice",
      options: choices("start"),
      err: "Pick one.",
    },
    { id: "budget", q: form.get("budget"), type: "choice", options: budgets, err: "Pick one." },
  ] as Question[],
  /**
   * A budget under the lowest price ends the form here: the answers are saved, these two lines show,
   * and no calendar opens.
   */
  tooLow: {
    id: "budget",
    option: budgets[0]!,
    lines: [form.get("budget, under 750, line 1"), form.get("budget, under 750, line 2")],
  },
  /** The calendar, inside the page, once the answers are saved. */
  calendar: { title: "Pick a time" },
  send: {
    busy: "Saving",
    done: "Saved",
    saving: "Saving your answers. Then the calendar opens.",
    savingPrep: "Saving your answers.",
    slow: "Still saving. Your answers are safe here.",
    failed: "Your answers did not save. They are still here.",
    offline: "No connection. Your answers are kept here. Try again when you are back online.",
    retry: "Try again",
    anyway: "Pick a time anyway",
    booked: "Pick a time",
  },
  /**
   * The plain form: a name, an email and one button. It takes the questions' place when saving fails.
   * These two lines show when the form's script stops; the browser then posts the form itself.
   */
  plain: {
    broken: "The questions stopped working. Your name and email are enough.",
    send: "Send",
  },
};

/**
 * The page after a booking. Its words are the deck's ("The booked page"); these four are short status lines the
 * deck does not hold. `saved` takes the button's place once someone who booked from a chat has answered.
 * The other three are said when answers typed before the booking are saved again from that page.
 */
export const booked = {
  saved: "Your answers are saved. See you on the call.",
  resent: "Your answers are saved now.",
  unsent: "Your answers have not saved yet. They are kept on this device.",
  retry: "Save my answers",
};

export const footer = {
  privacy: "Privacy",
  /** Shown only when CONTACT_EMAIL is set. `{email}` is CONTACT_EMAIL. */
  contact: "Questions? Write to {email}",
  rights: "© 2026 Arcbuildr",
};

export const notFound = {
  title: "Page not found | Arcbuildr",
  h1: "That page is not here.",
  body: "The link may be old or mistyped.",
  link: "Go to the home page",
};

export const privacy = {
  title: "Privacy | Arcbuildr",
  description:
    "What Arcbuildr collects when you use this site, why, who else handles it, and how to ask us to delete it.",
  h1: "Privacy",
  updated: "Last updated: 21 November 2026",
  /** A string is a paragraph. An array of strings is a list. `{email}` is CONTACT_EMAIL. */
  sections: [
    {
      id: "p-who",
      title: "Who we are",
      body: [
        "Arcbuildr plans and writes short video series for business owners. It is run by Zyade. To ask about your details, write to {email}.",
      ],
    },
    {
      id: "p-collect",
      title: "What we collect",
      body: [
        "On this site: the name and email you type before you start your application. With them we save the time, your time zone, the page you were on and the campaign tag in its link, if there is one.",
        "In the application: your answers to its 8 questions. They are kept on your device until they are saved with us. If saving fails, they stay on your device until it works. On the booking page: the time you pick and the details you give there.",
        "Our site statistics count visits to each page. They use no cookies and do not identify you.",
      ],
    },
    {
      id: "p-why",
      title: "Why we collect it",
      body: [
        "To prepare your call and your audit, to hold the call, and to see how many people visit and apply. We do not use your details for anything else.",
      ],
    },
    {
      id: "p-others",
      title: "Who else handles it",
      body: [
        "These services handle your details for us:",
        [
          "Cloudflare hosts this site and its application form, and counts visits without cookies.",
          "Cal.com runs the booking page.",
          "Google Sheets (Google) holds our list of applications.",
          "Resend sends us an email when someone applies.",
        ],
        "We do not sell your details or share them with anyone else.",
      ],
    },
    {
      id: "p-keep",
      title: "How long we keep it, and how to delete it",
      body: [
        "We keep your details while we talk about working together and while we work with you. To have them deleted, write to {email}. We delete them from our list and from our email.",
      ],
    },
  ],
};
