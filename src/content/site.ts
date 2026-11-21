/**
 * Every word on arcbuildr.co. Components read from here and never hold copy of their own.
 * The home page was rewritten on 21 Nov 2026 (L1-P9): 450 words on load, 25 on the first screen.
 * The words inside the five sample screens are test material with an invented owner and are not counted.
 * `{n}` is replaced with FOUNDING_PLACES_LEFT from src/config.ts.
 */

export const meta = {
  title: "Arcbuildr | 12 weeks of videos, written in your voice",
  description:
    "We plan 12 weeks of videos for your business and write each one in your voice. You film. Season One costs 750 to 1,750 USD. Apply in about 3 minutes.",
  /** The link a keyboard user meets first. */
  skip: "Skip to the content",
};

/** The one action. Same words everywhere. */
export const action = "Apply and pick a time";

/** The two fields that open the application, at the top of the home page and at its end. */
export const entry = {
  name: "Name",
  email: "Email",
  button: action,
};

/**
 * The home page's words come from the copy deck (src/content/deck.ts). These few are not in the deck:
 * who the face is, the two product names, and what the controls are called for a screen reader.
 */
export const page = {
  /** The header's button, once the first button has left the screen. */
  pill: "Apply",
  founder: { name: "Zyade Messaoudi", role: "co-founder", initials: "ZM" },
  marks: { claude: "Claude", chatgpt: "ChatGPT" },
  nav: "Sections",
};

export const founding = { count: "Founding price: {n} of 3 places left." };

export const home = {
  /** The header's button, once the first form has left the screen. */
  pill: "Apply",
  start: {
    h1: ["Stop guessing", "what to post."],
    /** Words in `[]` sit in a chip. */
    lede: "We plan 12 weeks of videos and write each one in your voice. You film. [750 to 1,750 USD]",
  },
  features: {
    h2: "Five tools you keep.",
    note: "Samples, made with an invented owner.",
    /** The tag on every screen. */
    sample: "Sample",
    cards: [
      {
        id: "profile",
        h3: "The profile your AI writes from",
        body: "We write it from your interview by day 7. Your Claude or ChatGPT reads it first.",
      },
      {
        id: "script",
        h3: "One idea becomes a checked script",
        body: "Type one idea. You get 3 angles, then a script with 10 checks run on it.",
      },
      {
        id: "setup",
        h3: "Your AI checks your setup before filming",
        body: "Send a photo of your setup. You get the one fix that matters most.",
      },
      {
        id: "editor",
        h3: "The video editor cuts your clip",
        body: "Drop a clip in and type edit. You see the cuts before it exports.",
      },
      {
        id: "files",
        h3: "We keep sending new files",
        body: "You add each one in 3 steps.",
      },
    ],
    /**
     * What the five screens show. Real test material with an invented owner, a bookkeeper for tradespeople
     * (L12-P1/mvp/tests, L12-P2/lab). Screen words are not part of the page's word count.
     */
    screens: {
      profile: {
        alt: "Sample: a profile being written from an interview, section by section, then saved.",
        source: "Your interview",
        length: "45 min",
        file: "my-profile.md",
        badge: "From your interview",
        rows: [
          {
            label: "What I sell, and who buys it",
            value:
              "I do the books for tradespeople: monthly bookkeeping and the quarterly VAT return.",
          },
          {
            label: "What clients say before they hire me",
            value: "“I'm good with my hands, not with paperwork.”",
          },
          { label: "How I talk", value: "“You fix boilers, I fix paperwork.”" },
          { label: "My stories", value: "Dev's carrier bag. Status: ready" },
          { label: "Never claim or share", value: "Never say I'll save them money on tax." },
        ],
        ask: "Anything wrong or missing?",
        yes: "Looks right",
        saved: "Saved",
      },
      script: {
        alt: "Sample: one typed idea becomes 3 angles, then a script with 10 checks passed.",
        source: "Your idea",
        length: "1 line",
        idea: "why I go and get the receipts from the van",
        anglesLabel: "3 angles",
        angles: ["The tenner of copper pipe", "The box in the van", "The shoebox that works"],
        title: "Video: The tenner of copper pipe",
        meta: "About 40 seconds, talking to camera",
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
          "Your voice",
          "Only you",
          "Natural wording",
          "Length",
        ],
        pass: "Pass",
        count: "All 10 checks",
        ready: "Ready to film.",
      },
      setup: {
        alt: "Sample: a photo of a filming setup is checked, and one fix is named.",
        source: "Your photo",
        length: "1 photo",
        typed: "filming check",
        head: "Filming check, from the photo",
        check: "Background",
        verdict: "OK",
        sees: "Plain grey-blue wall. Nothing pulls the eye.",
        fixLabel: "The one fix that matters most",
        fix: "Turn the phone upright.",
        after: "Send a new photo after the fix.",
      },
      editor: {
        alt: "Sample: a clip is dropped in, the cut list shows what goes, and the export waits for a yes.",
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
        ask: "This cuts more than a third. Export?",
        yes: "Yes, export",
        done: "Exported",
      },
      files: {
        alt: "Sample: a new file arrives with its 6 lines, and is added in 3 steps.",
        source: "New from us",
        length: "1 file",
        tag: "ADD-ON",
        lines: [
          { k: "Name", v: "Plan my week" },
          { k: "Version", v: "1.0 (1 Dec 2026)" },
          { k: "Adds", v: "a plan for the week's videos, in the order they film them" },
          { k: "Replaces", v: "nothing" },
        ],
        stepsLabel: "Add it in 3 steps",
        steps: ["Click Add, then Upload from device.", "Pick the new file.", "Type what's new?"],
        added: "Added",
        next: "Next: Read my numbers",
      },
    },
  },
  hub: {
    h2: "It starts from one 45-minute interview with me.",
    body: "You write nothing first.",
    inLabel: "In",
    outLabel: "Out",
    inputs: [
      "Brand Strategy",
      "Profile Audit & Optimization",
      "Visual Identity System",
      "Content Strategy",
    ],
    core: "Your profile",
    outputs: ["Scripts we write", "Drafts your AI writes", "Video editor"],
  },
  iceberg: {
    h2: "Three things are free before you pay.",
    freeLabel: "Free",
    free: [
      { text: "Sample script", href: "/sample" },
      { text: "One-page audit", href: "" },
      { text: "15-minute call", href: "" },
    ],
    waterline: "Season One",
    below: "Below the water",
    rows: [
      { when: "Day 7", what: "Brand Strategy, bio rewritten, AI set up" },
      { when: "Day 10", what: "First 3 scripts, shot lists, phone guide" },
      { when: "Day 14", what: "Visual Identity System, filming plan" },
      { when: "Day 21", what: "Content Strategy, scorecard" },
      { when: "Day 28, 42 or 56", what: "The rest of your scripts" },
      { when: "Setup call", what: "20 minutes, AI and editor working" },
      { when: "12 weeks", what: "Monday messages, 2 calls, 3 group reviews" },
      { when: "Then", what: "30 days of answers" },
      { when: "For life", what: "Client area, community, updates" },
    ],
  },
  install: {
    h2: "You install two things.",
    body: "Your footage stays on your computer.",
    /** The first tab is open on load. The other two are read only when picked. */
    tabs: [
      {
        id: "solo",
        label: "Just me",
        steps: [
          "Day 7: add your profile to your Claude or ChatGPT.",
          "Install the video editor in the Claude desktop app.",
          "I check both on a 20-minute call.",
        ],
      },
      {
        id: "editor",
        label: "With an editor",
        steps: [
          "The same step 1.",
          "Send your editor one link: the editing page and the video editor, with a message ready to send.",
          "Your editor reads one page and runs the video editor in the Claude desktop app.",
        ],
      },
      {
        id: "team",
        label: "With a team",
        steps: [
          "The same step 1.",
          "Each person opens their own page: filming, editing or posting.",
          "Anyone on your team who uses AI adds the same profile.",
        ],
      },
    ],
  },
  price: {
    h2: "Season One costs 750 to 1,750 USD.",
    body: "You get the exact price on the call, and it stays the same. We don't film, edit or post for you.",
    cols: ["Scripts", "Weekly", "Written by day"],
    rows: [
      ["12", "1", "28"],
      ["24", "2", "42"],
      ["36", "3", "56"],
    ],
  },
  refund: {
    h2: "Full refund if the Brand Strategy isn't you.",
    body: "It arrives on day 7. Tell me within 3 days and I refund you within 5 working days. You keep the document.",
  },
  faq: {
    h2: "Questions",
    /** Answers are closed on load. 40 words each at most. */
    items: [
      {
        id: "q-time",
        q: "How much of my time?",
        a: "A 45-minute interview, with nothing to write first. You read each document and script and tell me what to change. You film in about 4 sittings. Editing and posting stay with you or your editor.",
      },
      {
        id: "q-app",
        q: "Which AI app do I need?",
        a: "Your profile works in Claude or ChatGPT. We tested ChatGPT's free plan and Claude's paid plan. The video editor runs in the Claude desktop app and needs Claude Pro or higher: Claude's free plan does not run it.",
      },
      {
        id: "q-self",
        q: "Can I ask ChatGPT myself?",
        a: "You can. You get what it writes for anyone in your field. Our scripts start from your interview, and I direct and review each one myself. If scripts are all you need, AI alone costs less.",
      },
      {
        id: "q-camera",
        q: "I'm not comfortable on camera.",
        a: "Each script has a card with the points to say and the one line to keep word for word. A one-page guide to filming on your phone arrives on day 10. You film where you already work.",
      },
      {
        id: "q-keep",
        q: "What do I keep after 12 weeks?",
        a: "You keep the documents, the scripts, your profile and the video editor, and they work without us. You get 30 days of answers, and updates at no cost for as long as we make them.",
      },
    ],
  },
  book: {
    h2: "Book a 15-minute call with me.",
    body: "Answer 8 questions, then pick a time. I show you a one-page audit of your videos, and you keep it.",
  },
};

/**
 * The application: one question per screen. The same 8 questions as the form it replaces, in the same order,
 * with the same choices (checked against that form on 21 Nov 2026). The answers tab's headings are these questions.
 * `prep` is the same form for someone who booked from a chat: it saves the answers and stays on /booked.
 */
export const application = {
  label: "Application",
  hi: "Hi {name}. 8 questions, about 3 minutes, then you pick a time.",
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
    { id: "name", q: "First, your name.", ph: "Name", err: "Add your name." },
    { id: "email", q: "And your email.", ph: "Email", err: "Check your email address." },
  ],
  questions: [
    {
      id: "profile",
      q: "Link to your main profile.",
      type: "link",
      ph: "A link or your handle",
      err: "Add a link to your profile, or your handle.",
    },
    {
      id: "sell",
      q: "What do you sell, and what is one new client worth to you?",
      type: "long",
      ph: "For example: coaching for founders, about 2,000 USD per client",
      err: "A few words are enough.",
    },
    {
      id: "stranger",
      q: "If a stranger watched 3 of your videos, what would they say you do?",
      type: "long",
      ph: "Their words, not yours",
      err: "A few words are enough.",
    },
    {
      id: "film",
      q: "Where do you film today?",
      type: "choice",
      options: [
        "At my office or studio",
        "At home",
        "At my clinic, shop or workplace",
        "Outdoors or on the move",
        "Somewhere else",
      ],
      err: "Pick one.",
    },
    {
      id: "count",
      q: "How many videos did you post in the last 30 days?",
      type: "choice",
      options: ["None", "1 to 4", "5 to 9", "10 to 19", "20 or more"],
      err: "Pick one.",
    },
    {
      id: "decides",
      q: "Who decides on this with you?",
      type: "choice",
      options: ["Just me", "Me and a partner", "A team"],
      err: "Pick one.",
    },
    {
      id: "start",
      q: "When do you want to start?",
      type: "choice",
      options: ["This week", "This month", "Next month", "Just exploring"],
      err: "Pick one.",
    },
    {
      id: "budget",
      q: "What budget do you have in mind for your content over the next 3 months?",
      type: "choice",
      options: ["Under 500 USD", "500 to 1,500 USD", "1,500 to 3,000 USD", "Over 3,000 USD"],
      err: "Pick one.",
    },
  ],
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
} as const;

export const sample = {
  title: "A sample script | Arcbuildr",
  description:
    "Episode 1 of a sample season, written for an invented business owner: what to say, what to show, and the caption.",
  h1: "A sample script.",
  intro:
    "This is episode 1 of a sample season. We wrote it for an invented business owner: Ines, an interior designer for small apartments. She is not a real client.",
  doc: {
    code: "Season 1, episode 1",
    length: "0:45",
    title: "The client I turned away, and why",
    sayHead: "Say",
    showHead: "Show",
    rows: [
      {
        t: "0:00",
        say: "Last month I turned a client away. She wanted a table for six in a kitchen of nine square metres.",
        show: "You, in a small kitchen, facing the camera. Text on screen: “I turned a client away.”",
      },
      {
        t: "0:08",
        say: "I drew it for her. With the table in place, the oven door only opens halfway.",
        show: "Your hand on the floor plan, drawing the table. Then the oven door, stopped halfway.",
      },
      {
        t: "0:16",
        say: "She still wanted it. So I told her I was not the right designer for her, and I gave her two other names.",
        show: "Back to you. Closer.",
      },
      {
        t: "0:25",
        say: "I only take a home when I can make it work for the person who lives in it. A small space works when every piece does two jobs.",
        show: "Three quick shots: a bench with storage, a table that folds, a door that slides.",
      },
      {
        t: "0:35",
        say: "That is what this series is about. Small homes that work, and one idea you can use in every episode.",
        show: "You, same spot as the opening.",
      },
      {
        t: "0:42",
        say: "Next: my first visit to a new client, minute by minute.",
        show: "Text on screen: “Episode 2. The first visit.”",
      },
    ],
    captionLabel: "Caption",
    caption: "I said no to a paying client last month. Here is why.",
  },
  place: {
    label: "Its place in the season",
    code: "Episode 1 of 24, week 1",
    job: "This episode’s job: one true story that shows what you stand for.",
    next: [
      "Episode 2: My first visit to a new client, minute by minute",
      "Episode 3: The advice I gave for 6 years and stopped giving",
    ],
  },
  after:
    "Your scripts will be different: they come from your own interview. The layout is the same: what to say, what to show, the caption.",
  cta: "On the call you get your own page: a one-page audit of your videos, and you keep it.",
};

/**
 * The page a visitor lands on after booking the call. Cal.com sends them here.
 * It must also read right when the 8 questions come after the booking, so it never says they are answered.
 */
export const booked = {
  title: "You are booked | Arcbuildr",
  description: "Your call with Zyade is booked. What happens on the call, and what to have ready.",
  h1: "You’re booked.",
  /** Used when the booking link carries a first name. */
  h1Named: "You’re booked, {name}.",
  invite:
    "The invite comes by email. If it is not in your inbox in 2 minutes, check spam. If your email shows it as from an unknown sender, confirm that you know the sender, then accept it.",
  calendar: "Add it to your calendar now.",
  /** Only for a booking made from a chat. */
  chat: "Messages about your call come from Zyade or Hanane, in the chat you used.",
  video: {
    title: "Watch this before we talk",
    length: "75 seconds",
    play: "Play the video",
    alt: "Zyade, drawn in pixel art, giving a thumbs-up.",
  },
  call: {
    title: "On the call",
    meta: "15 minutes, with Zyade",
    items: [
      "5 minutes on your business and how you post today.",
      "Your audit, on screen: one page on the 3 things your videos leave unclear.",
      "If Season One fits you, I tell you the price and the dates. If it does not, I say so. The page is yours either way.",
    ],
  },
  ready: {
    title: "Have ready",
    items: ["What one new client is worth to you.", "The last 3 videos you posted."],
  },
  before: {
    title: "Before we talk",
    items: [{ text: "Read the sample script", href: "/sample" }],
  },
  refund:
    "A full refund on the first delivery. If your Brand Strategy is not you, tell us within 3 days. We refund every dollar, and you keep the document.",
  /**
   * `body` shows to everyone except a visitor who booked from a chat: they have not answered
   * the 8 questions yet, so `first` takes its place and `link` is their button.
   * `link` has two parts. Each stays on one line; on a phone the button breaks between them.
   * `saved` replaces the button once their answers are in. `resent` is said when answers that had not
   * saved before the booking are saved from this page.
   */
  application: {
    body: "We prepare your audit from your account and your answers to the 8 questions.",
    first: "The 8 questions come first: we prepare your audit from your answers and your account.",
    link: ["Answer the 8 questions", "(3 minutes)"],
    saved: "Your answers are saved. See you on the call.",
    resent: "Your answers are saved now.",
    unsent: "Your answers have not saved yet. They are kept on this device.",
    retry: "Save my answers",
  },
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
