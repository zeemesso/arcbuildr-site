/**
 * Every word on arcbuildr.co. Components read from here and never hold copy of their own.
 * Cut on 18 Nov 2026 (L1-P8) from the Gate 2 copy: the same facts and promises, in about a third of the words.
 * What a picture now says is not repeated in a sentence. Do not add words back from a build task.
 * `{n}` is replaced with FOUNDING_PLACES_LEFT from src/config.ts.
 */

export const meta = {
  title: "Arcbuildr | Your content, built like a series",
  description:
    "We plan 12 weeks of short videos for your business and write each one in your voice. You just film. Read a sample script, then apply in about 3 minutes.",
  /** The link a keyboard user meets first. */
  skip: "Skip to the content",
};

/** The one action. Same words everywhere. */
export const action = "Start your application";

export const entry = {
  nameLabel: "Your name",
  emailLabel: "Your email",
  button: action,
  errors: {
    name: "Add your name.",
    email: "Check your email address.",
  },
  opening: "Opening your application.",
  /** What happens after the button, shown as three icons. */
  steps: ["8 questions, 3 minutes", "A 15-minute call", "No payment on this page"],
};

/** The price card says who pays the founding price. This line counts the places. */
export const founding = { count: "{n} of 3", label: "founding places left" };

export const hero = {
  who: "For business owners who film their own short videos",
  /** One headline, set on two lines. */
  h1: ["Your content,", "built like a series."],
  lede: "We plan 12 weeks of videos and write each one in your voice. You just film.",
};

/** The card beside the form. The video part shows once FOUNDER_VIDEO is set in src/config.ts. */
export const founder = {
  title: "You work directly with me.",
  body: "I’m Zyade. I do your interview, plan your season with you and review every script. No account manager.",
  alt: "Zyade, drawn in pixel art, giving a thumbs-up.",
  video: { title: "Zyade explains Season One", length: "90 seconds", play: "Play the video" },
};

export const problem = {
  h2: "You have posted 30 videos. Could a stranger tell they come from the same business?",
  quotes: [
    "A stranger could not say what I do.",
    "My videos don’t look like they come from one business.",
    "I sit down to film and don’t know what to say.",
    "I post for three weeks, then I stop.",
  ],
  picture: {
    left: "12 posts",
    right: "One season",
    alt: "Two grids. On the left, 12 posts that share nothing. On the right, the same number of tiles in order, numbered as episodes of one season.",
  },
  cause: "Same cause: three things were never decided.",
  /** In order. The same three numbers mark the three documents in the offer. */
  undecided: [
    "What you want to be known for",
    "How your videos look",
    "What each video is about, planned ahead",
  ],
  close:
    "Filming more will not decide them. The Show Method does: with you, in this order, before we write a word.",
};

/** The character module. Only this part of the page is pixel art. */
export const season = {
  h2: "Choose your season.",
  sub: "One episode is one video.",
  legend: "Season",
  seasons: [
    { id: "anime", label: "Anime" },
    { id: "scifi", label: "Sci-fi" },
    { id: "western", label: "Western" },
    { id: "detective", label: "Detective" },
  ],
  /** The counter on the stage: "Episode 03 of 24" and "Day 10". */
  tag: { episode: "Episode", of: "of 24", day: "Day" },
  caption: "We write the first 3 by day\u00a010 and all 24 by day\u00a042.",
  alt: "A pixel-art Zyade walks an arc of 24 episode tiles. Each tile fills in as that episode is written: the first 3 by day 10, all 24 by day 42. Pick a season and he changes costume before he walks.",
};

export const offer = {
  h2: "Season One: 12 weeks of videos, written for you. You film.",
  strip: {
    alt: "The 12 weeks. Deliveries on days 1, 7, 10, 14, 21 and 42. A message from us every Monday. A 15-minute call in week 4 and in week 8.",
    legend: ["A delivery", "Every Monday: what you posted, what comes next", "A 15-minute call"],
  },
  /** For the 24. `decides` ties a document to one of the three undecided things. */
  when: "Day",
  cards: [
    {
      day: 1,
      title: "Your interview",
      body: "45 minutes. Your private page opens: every document in one place, yours to keep.",
      art: "chat",
      hue: "taupe",
    },
    {
      day: 7,
      title: "Brand Strategy",
      body: "What you want to be known for, in one paragraph. Your 3 to 5 beliefs, your main story, your voice rules. Your profile, rewritten to match.",
      art: "target",
      hue: "sage",
      decides: 1,
    },
    {
      day: 10,
      title: "Your first 3 episodes",
      body: "Each with a shot list. You film in week 2.",
      art: "stack",
      hue: "clay",
    },
    {
      day: 14,
      title: "Visual Identity System",
      body: "3 to 5 colours, 1 or 2 fonts, how to film where you already work. Your filming plan: about 6 episodes a session, with a one-page guide to filming on a phone.",
      art: "swatches",
      hue: "accent",
      decides: 2,
    },
    {
      day: 21,
      title: "Content Strategy",
      body: "3 to 5 formats you repeat. The season plan: one line per episode.",
      art: "plan",
      hue: "ink",
      decides: 3,
    },
    {
      day: 42,
      title: "All 24 episodes",
      body: "Each one: what to say, what to show, the caption.",
      art: "dots",
      hue: "taupe",
    },
  ] as { day: number; title: string; body: string; art: string; hue: string; decides?: number }[],
  sizes: {
    unit: "episodes",
    rows: [
      { n: "12", rhythm: "1 a week", by: "written by day 28", pick: false },
      { n: "24", rhythm: "2 a week", by: "written by day 42", pick: true },
      { n: "36", rhythm: "3 a week", by: "written by day 56", pick: false },
    ],
    pickTag: "We recommend this one",
    note: "We suggest a size on the call, from how often you post now.",
  },
  price: {
    label: "The price",
    from: "750",
    join: "to",
    to: "1,750",
    unit: "USD",
    line: "One fixed price per size, paid once. More episodes cost more. The first 3 clients pay the founding price, which is lower. You hear your exact price on the call, after your Show Audit. It does not change.",
  },
};

export const ai = {
  h2: "AI will write you 24 scripts in a minute.",
  body: "They are the same 24 it would write for anyone in your field. Ours start from your interview. If scripts are all you need, AI is the cheaper choice.",
};

export const proof = {
  h2: "I will not show you results I do not have yet. I show you the work.",
  sample: {
    label: "On this page",
    title: "A sample script",
    intro: "Episode 1, written for Ines, an invented interior designer. Not a real client.",
    link: { text: "Read the whole episode", href: "/sample" },
  },
  audit: {
    label: "On the call",
    title: "Your Show Audit",
    body: "One page on the 3 things your videos leave unclear, written from your account before the call. It says what you should be known for, in one line, and gives you 3 episode titles from your own story. You keep it, whatever you decide.",
  },
  refund: {
    label: "After you pay",
    title: "A full refund on the first delivery",
    steps: [
      { figure: "Day 7", text: "Your Brand Strategy arrives." },
      { figure: "3 days", text: "to tell us you are not happy. No reason needed." },
      { figure: "5 working days", text: "to get every dollar back. You keep the document." },
    ],
    rewrites: "Then unlimited rewrites of any episode, during the 12 weeks.",
    not: "Not guaranteed: followers, views or sales.",
  },
};

/** The sample episode. Its first row shows on the home page; all of it is on /sample. */
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
  cta: "On the call you get your own page: your Show Audit, with 3 episode titles from your story.",
};

export const evidence = {
  h2: "Why a series?",
  line: "Our reasoning: people come back to what they recognise.",
  summary: "The research, and where it stops",
  /** All four sources were opened and each sentence checked against them on 18 Nov 2026. */
  findings: [
    {
      id: "zajonc",
      figure: "72 people",
      claim:
        "saw invented words, some once, others up to 25 times. The more often a word had come up, the better the meaning they guessed.",
      source: "Zajonc, Journal of Personality and Social Psychology, 1968",
    },
    {
      id: "wirz",
      figure: "133 people",
      claim:
        "Ending an episode at its most exciting moment raised their excitement, not their enjoyment or their wish to keep watching. We write no trick endings.",
      source: "Wirz and others, Psychology of Popular Media, 2023",
    },
    {
      id: "wga",
      figure: "7 to 8 writers",
      claim:
        "typically write a streaming series. Today you are the whole team. We take the writing.",
      source: "Writers Guild of America East, Staff Size Guide, July 2025",
    },
    {
      id: "edelman",
      figure: "9 in 10",
      claim:
        "decision-makers said they are more open to sales or marketing messages from a company that regularly publishes high-quality expert content.",
      source: "Edelman, B2B Thought Leadership Impact Report, 2024. 3,484 executives",
    },
  ],
  limit:
    "We found no published test of one owner’s series against the same owner’s unrelated videos. So we promise only what we control: your plan, every episode written, and the dates. Not an audience.",
};

export const fit = {
  h2: "Who Season One is for.",
  yes: {
    title: "For you if",
    items: [
      "You sell a service or your expertise, with your own face. Any field.",
      "You already film and post, but nothing ties your videos together.",
      "One new client is worth 1,000 USD or more to you.",
      "You will film and post every week for 12 weeks.",
    ],
  },
  no: {
    title: "Not for you if",
    items: [
      "You want someone to film, edit, post or run ads for you.",
      "You would rather stay off camera.",
      "You have nothing to sell yet.",
    ],
  },
};

export const questions = {
  h2: "Questions",
  items: [
    {
      id: "q-time",
      q: "How much of my time does it take?",
      a: "A 45-minute interview. Reading each document and script, and telling us within 3 days what to change. About 4 filming sessions. Two 15-minute calls, in weeks 4 and 8. Editing and posting are yours, or someone who helps you.",
    },
    {
      id: "q-camera",
      q: "I am not comfortable on camera.",
      a: "That is fine, as long as you are willing to film. Every script uses your own words, written to be said out loud. The shot list tells you where to stand and what to show.",
    },
    {
      id: "q-fit",
      q: "What if we are not a fit?",
      a: "We say so on the call, and why. You keep your Show Audit either way.",
    },
    {
      id: "q-after",
      q: "What happens after the 12 weeks?",
      a: "You keep everything: the strategy, the look, the plan and every script. A Season Two can be built on them. It is not on sale yet.",
    },
  ],
};

export const apply = {
  h2: "Apply for Season One.",
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
  invite: "The invite comes by email. If it is not in your inbox in 2 minutes, check spam.",
  calendar: "Add it to your calendar now.",
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
      "Your Show Audit, on screen: one page on the 3 things your videos leave unclear.",
      "If Season One fits you, I tell you the price and the dates. If it does not, I say so. The page is yours either way.",
    ],
  },
  ready: {
    title: "Have ready",
    items: ["What one new client is worth to you.", "The last 3 videos you posted."],
  },
  before: {
    title: "Before we talk",
    items: [
      { text: "Read the sample script", href: "/sample" },
      { text: "Read the research", href: "/#evidence" },
    ],
  },
  refund:
    "A full refund on the first delivery. If your Brand Strategy is not you, tell us within 3 days. We refund every dollar, and you keep the document.",
  /**
   * `body` always shows. `ask` and `link` show only when APPLICATION_AFTER_BOOKING_URL is set,
   * for someone who booked before answering the 8 questions.
   */
  application: {
    body: "We prepare your Show Audit from your account and your answers to the 8 questions.",
    ask: "Not answered yet? It takes about 3 minutes.",
    link: "Answer the 8 questions",
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
  updated: "Last updated: 18 November 2026",
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
        "In the application: your answers to its 8 questions. On the booking page: the time you pick and the details you give there.",
        "Our site statistics count visits to each page. They use no cookies and do not identify you.",
      ],
    },
    {
      id: "p-why",
      title: "Why we collect it",
      body: [
        "To prepare your call and your Show Audit, to hold the call, and to see how many people visit and apply. We do not use your details for anything else.",
      ],
    },
    {
      id: "p-others",
      title: "Who else handles it",
      body: [
        "These services handle your details for us:",
        [
          "Cloudflare hosts this site and counts visits without cookies.",
          "Tally runs the application form.",
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
