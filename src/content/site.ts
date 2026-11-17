/**
 * Every word on arcbuildr.co. Written and reviewed by hand (L1-P6, Gate 2, 18 Nov 2026).
 * Components read from here and never hold copy of their own.
 * Do not reword, reorder or "fix" any string in this file from a build task.
 * `{n}` is replaced with FOUNDING_PLACES_LEFT from src/config.ts.
 */

export const meta = {
  title: "Arcbuildr | Your content, built like a series",
  description:
    "We plan 12 weeks of short videos for your business and write each one in your voice. You just film. See a sample script, then apply in about 3 minutes.",
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
};

export const founding = "The first 3 clients pay the founding price. {n} of 3 places left.";

export const hero = {
  kicker: "For business owners who film their own short videos",
  h1: "Your content, built like a series.",
  lede: "Stop guessing what to post. We plan 12 weeks of videos and write each one in your voice, so people remember what you do. You just film.",
  notes: [
    "8 short questions, about 3 minutes. Then a 15-minute call to see if we fit. No payment on this page.",
    "You see the work before you pay: a sample script on this page, and one page about your own videos on the call.",
  ],
};

/** The season animation: every word it shows, and its text alternative. */
export const seasonMap = {
  title: "Season One: 24 episodes. One episode is one video.",
  /** The mini map's label: this word, then the episode number. */
  tag: "EPISODE",
  day: "DAY",
  written: "WRITTEN",
  of: "OF",
  replay: "REPLAY",
  replayLabel: "Replay the season animation",
  caption: [
    "We write the first 3 by day 10 and all 24 by day 42.",
    "You post 2 a week, for 12 weeks.",
  ],
  alt: "A map of one season: 24 numbered episode tiles along one arc. A small figure walks the arc, and each tile fills in as that episode is written. The first 3 are written by day 10, and all 24 by day 42.",
};

export const beforeYouPay = {
  kicker: "Before you pay",
  h2: "Here is how you see the work before you pay.",
  items: [
    {
      label: "On this page",
      title: "A sample script.",
      body: "One full episode, written for an invented business owner and labelled as a sample.",
      link: { text: "See the sample", href: "#sample" },
    },
    {
      label: "On the call",
      title: "One page about your own videos.",
      body: "We call it your Show Audit. We look at your account before the call (the application asks for the link) and write it for you. It says, in one line, what you should be known for. It shows the 3 decisions that are still open in your videos. One example: what every video should have in common. And it gives you 3 episode titles taken from your own story. You keep it, whatever you decide.",
    },
    {
      label: "After you pay",
      title: "A full refund on the first delivery.",
      body: "Your Brand Strategy arrives by day 7. It is the document that says what you want to be known for. Not happy with it? Tell us within 3 days of getting it. We refund every dollar, and you keep the document.",
    },
  ],
};

export const problem = {
  kicker: "The problem",
  h2: "You have posted 30 videos. Could a stranger tell they come from the same business?",
  quotes: [
    "A stranger could not say what I do.",
    "My videos don’t look like they come from one business.",
    "I sit down to film and don’t know what to say.",
    "I post for three weeks, then I stop.",
  ],
  cause: "These four usually have the same cause. Three things were never decided.",
  undecided: [
    {
      n: "01",
      what: "What you want to be known for.",
      example: "Example: “the designer who makes small apartments work”.",
    },
    {
      n: "02",
      what: "How your videos look.",
      example: "Example: the same two colours and the same background, every time.",
    },
    {
      n: "03",
      what: "What each video is about, planned ahead.",
      example: "Example: a plan with one line for each of your 24 videos.",
    },
  ],
  close: "Filming more will not decide these three things. A series starts by deciding them.",
  picture: {
    left: { code: "12 POSTS", line: "Each one about something different." },
    right: { code: "ONE SEASON", line: "One series. Each episode has its number." },
    alt: "Two grids. On the left, 12 posts that share nothing. On the right, the same number of tiles in order, numbered as episodes of one season.",
  },
};

export type Finding = { id: string; claim: string; detail: string; why: string; source: string };

export const evidence = {
  kicker: "The evidence",
  h2: "Why a series? The research, and where it stops.",
  intro:
    "A series is the same person, in the same setting, again and again. Our reasoning: people come back to what they recognise. Here is the research behind it, and the one question it does not answer.",
  whyLabel: "Why it matters here",
  /** All four sources were opened and each sentence checked against them on 18 Nov 2026. */
  findings: [
    {
      id: "zajonc",
      claim: "People like what they have seen before.",
      detail:
        "In a 1968 experiment, 72 people saw and said invented words, presented as foreign words. Some came up once, others up to 25 times. Then they guessed how good each word’s meaning was. The more often a word had come up, the better the meaning they guessed.",
      why: "A series shows people the same person, look and formats again and again.",
      source: "Zajonc · Journal of Personality and Social Psychology · 1968",
    },
    {
      id: "wirz",
      claim: "Stopping at the most exciting moment is not what brings people back.",
      detail:
        "In a 2023 experiment with 133 people, ending an episode at its most exciting moment raised their excitement. It did not raise their enjoyment, or their wish to keep watching.",
      why: "We do not write trick endings. We write episodes people recognise.",
      source: "Wirz and others · Psychology of Popular Media · 2023",
    },
    {
      id: "wga",
      claim: "A TV series is usually written by a team, not by the person on screen.",
      detail:
        "A streaming series is written by a team called a writers’ room: typically 7 to 8 writers.",
      why: "Today you are on screen and you are the whole writing team. We take the writing.",
      source: "Writers Guild of America East · Staff Size Guide · July 2025",
    },
    {
      id: "edelman",
      claim: "Business buyers are more open to companies that publish good work regularly.",
      detail:
        "A report published in 2024 surveyed 3,484 business executives. 9 in 10 of the decision-makers said they are more open to sales or marketing messages from a company that regularly publishes high-quality expert content.",
      why: "If you sell to businesses, publishing good work regularly makes buyers easier to reach.",
      source: "Edelman · B2B Thought Leadership Impact Report · 2024 · 3,484 executives",
    },
  ] satisfies Finding[],
  limit: {
    title: "The question the research does not answer.",
    body: "Does one owner’s series do better than the same owner’s unrelated videos? We looked for a published test and found none. So we promise only what we control: your plan, every episode written, and the dates. We do not promise you an audience.",
  },
  role: "Today you do four jobs: you plan your videos, write them, film them and edit them. The first two decide whether they feel like one series. We take those two.",
};

export const method = {
  kicker: "The method",
  h2: "Three steps, in order.",
  intro:
    "We call it the Show Method. Every series decides three things: who it is about, what it looks like, and what happens in each episode. Most business videos skip all three. We decide them with you, in this order.",
  getLabel: "You get",
  steps: [
    {
      n: "01",
      plain: "Who it is about: you.",
      doc: "Your Brand Strategy.",
      body: "We interview you for 45 minutes. From what you have done, sold and learned, we write what you want to be known for, in one paragraph. Then the 3 to 5 beliefs you stand for, your main story, and your voice rules: the words you use and the ones you never use. We also rewrite your profile to match.",
      fixes: ["A stranger could not say what I do."],
    },
    {
      n: "02",
      plain: "What it looks like.",
      doc: "Your Visual Identity System.",
      body: "Your colours (3 to 5) and your fonts (1 or 2) for the text on screen. And how to film in the places you already work: where to stand, the light, the background. The goal: your videos look like they come from one business.",
      fixes: ["My videos don’t look like they come from one business."],
    },
    {
      n: "03",
      plain: "What happens in each episode.",
      doc: "Your Content Strategy, and every episode.",
      body: "3 to 5 formats you repeat, for example a client question answered in 40 seconds. A season plan with one line per episode. And every episode written in your voice: what to say, what to show, the caption.",
      fixes: [
        "I sit down to film and don’t know what to say.",
        "I post for three weeks, then I stop.",
      ],
    },
  ],
  fixesLabel: "Fixes",
  order: {
    title: "Why this order?",
    body: "A script written before step 1 could belong to anyone. So we write nothing until we know what you stand for. Then we write your first 3 episodes, so you can start filming in week 2 while we finish the look and the plan. Every date is in the offer below.",
  },
};

export const sample = {
  kicker: "A sample",
  h2: "See a script before you start yours.",
  intro:
    "This is episode 1 of a sample season. We wrote it for an invented business owner: Ines, an interior designer for small apartments. She is not a real client.",
  stamp: "Sample · invented owner",
  doc: {
    code: "Season 1 · Episode 1 · Script",
    title: "The client I turned away, and why",
    meta: ["Length 0:45", "For: Ines, interior designer (invented)"],
    sayHead: "SAY",
    showHead: "SHOW",
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
    captionLabel: "CAPTION",
    caption: "I said no to a paying client last month. Here is why.",
  },
  place: {
    label: "Its place in the season",
    code: "Episode 1 of 24 · week 1",
    job: "This episode’s job: one true story that shows what you stand for.",
    next: [
      "Episode 2 · My first visit to a new client, minute by minute",
      "Episode 3 · The advice I gave for 6 years and stopped giving",
    ],
    alt: "The season map with tile 1 of 24 marked: this script is episode 1.",
  },
  after:
    "Your scripts will be different: they come from your own interview. The layout is the same: what to say on the left, what to show on the right.",
  ctaNote:
    "On the call you get your own page: a review of your videos, with 3 episode titles from your story.",
};

export const whyNotAi = {
  kicker: "Why not just AI",
  h2: "AI will write you 24 scripts in a minute.",
  intro:
    "They are the same 24 it would write for anyone in your field. Tips and templates are free now, so we do not sell them. Here are four things you do not get when you ask AI for scripts.",
  points: [
    {
      n: "01",
      title: "A season built from your real story",
      body: "What you stand for comes from what you have lived and done. We get it in a 45-minute interview with you. AI only has what you type into it.",
    },
    {
      n: "02",
      title: "Every episode in your own voice",
      body: "Your words, your examples, the way you explain things to a client. Each episode is written to be said out loud, by you. If a line does not sound like you, we rewrite it.",
    },
    {
      n: "03",
      title: "One plan for the whole season",
      body: "All 24 episodes are planned together, from your interview, one line each. Each episode has a job. Example: episode 1 says what you stand for, and episode 2 shows how you work.",
    },
    {
      n: "04",
      title: "Someone who keeps you on track for 12 weeks",
      body: "Every Monday you get a message from us: what you filmed and posted last week, and what comes next. Zyade, who runs Arcbuildr, reviews every script before you get it. And there is a 15-minute call in week 4 and in week 8.",
    },
  ],
};

export const offer = {
  kicker: "The offer",
  h2: "Season One: 12 weeks of videos, written for you. You film.",
  intro:
    "One offer. What you stand for, how your videos look, and a full season of episodes written in your voice.",
  sizes: {
    head: ["Size", "Rhythm", "All ready by"],
    rows: [
      { size: "12 episodes", rhythm: "1 a week for 12 weeks", by: "Day 28", pick: false },
      { size: "24 episodes", rhythm: "2 a week for 12 weeks", by: "Day 42", pick: true },
      { size: "36 episodes", rhythm: "3 a week for 12 weeks", by: "Day 56", pick: false },
    ],
    pickTag: "We recommend this one",
    note: "We recommend the 24: two videos a week, filmed in about 4 sessions of 6 episodes. Tell us how often you post now, and we suggest one size on the call.",
  },
  timeline: {
    title: "What you get, and when (for the 24). Day 1 is your interview.",
    rows: [
      {
        when: "Day 1",
        what: "Your 45-minute interview. Your own private page opens online: every document in one place, yours to keep.",
      },
      {
        when: "Day 7",
        what: "Your Brand Strategy: what you want to be known for. We rewrite your profile to match.",
      },
      {
        when: "Day 10",
        what: "Your first 3 episodes, written, each with a shot list: what to film, in order. You film in week 2.",
      },
      {
        when: "Day 14",
        what: "Your Visual Identity System: how your videos look. Your filming plan: how to film about 6 episodes in one session, and a one-page guide to filming on a phone.",
      },
      {
        when: "Day 21",
        what: "Your Content Strategy: the formats you repeat and the season plan, one line per episode.",
      },
      {
        when: "Day 42",
        what: "All 24 episodes written. Each one: what to say, what to show, the caption.",
      },
      {
        when: "Weeks 1–12",
        what: "Every Monday, a message from us: what you filmed and posted last week, and what comes next. Zyade reviews every script before you get it. A 15-minute call in week 4 and in week 8.",
      },
    ],
  },
  yourPart: {
    title: "Your part",
    items: [
      "The 45-minute interview.",
      "Read each document and script when it arrives, and tell us within 3 days what to change.",
      "Film from the scripts.",
      "Edit and post.",
    ],
  },
  notIncluded: {
    title: "Not included",
    items: ["Filming, editing, posting and ads.", "Any promise of followers, views or sales."],
  },
  price:
    "Each size has one fixed price. It is set by the size, not by the call. You hear it on the call, after your Show Audit.",
  priceLink: { text: "See the price range", href: "#q-price" },
};

export const guarantee = {
  kicker: "The guarantee",
  h2: "A full refund on the first delivery. Then unlimited rewrites.",
  body: "Your Brand Strategy arrives by day 7. If you are not happy with it, tell us within 3 days of receiving it. We refund every dollar, and you keep the document. After that, we rewrite any episode as often as you ask, during the 12 weeks.",
  rows: [
    { label: "Any reason", text: "One message is enough. You do not have to explain." },
    { label: "The refund", text: "In full, within 5 working days." },
    { label: "The rewrites", text: "No limit, during the 12 weeks." },
  ],
  not: {
    title: "What we do not guarantee",
    body: "Followers, views and sales. They depend on filming and posting, and that part is yours. We guarantee the part we control.",
  },
};

export const fit = {
  kicker: "Who it is for",
  h2: "Who Season One is for.",
  yes: {
    title: "For you if",
    items: [
      "You sell a service or your expertise, and you are the face of your business.",
      "You already film and post, but nothing ties your videos together.",
      "One new client is worth 1,000 USD or more to you.",
      "You will film from scripts and post every week for 12 weeks.",
    ],
  },
  no: {
    title: "Not for you if",
    items: [
      "You want someone to film, edit or post for you.",
      "You want a guaranteed number of followers.",
      "You would rather stay off camera.",
      "You have nothing to sell yet.",
    ],
  },
};

export const founder = {
  kicker: "Who you work with",
  h2: "You work directly with me.",
  body: [
    "I’m Zyade, and I run Arcbuildr. I do your interview. I plan your season with you. I review every script before you get it. No account manager stands between us.",
    "I will not show you results I do not have yet. I show you the work: a sample script on this page, and your own Show Audit on the call.",
  ],
};

export const questions = {
  kicker: "Questions",
  h2: "Questions",
  items: [
    {
      id: "q-price",
      q: "How much does it cost?",
      a: "Between 750 and 1,750 USD, one fixed price per size, paid once. More episodes cost more. The first 3 clients pay the founding price, which is lower than the price after them. You hear your exact price on the call, after your Show Audit, and it does not change.",
    },
    {
      id: "q-ai",
      q: "AI writes scripts for free. Why pay for this?",
      a: "AI writes the scripts it would write for anyone. We start from a 45-minute interview with you, work out what you stand for, and plan the whole season in your voice. Then we keep you on track for 12 weeks. If scripts are all you need, AI is the cheaper choice.",
    },
    {
      id: "q-ai-us",
      q: "Do you use AI yourselves?",
      a: "Of course. It would be strange not to in 2026. AI runs our internal systems, which is how we move fast and deliver on time. The creative work is different: it starts from your interview, and I direct and review every script myself. AI amplifies our creativity. It doesn’t replace it.",
    },
    {
      id: "q-long",
      q: "How long does it take?",
      a: "Your first 3 episodes are written by day 10, and you film in week 2. All 24 are written by day 42. The season runs for 12 weeks.",
    },
    {
      id: "q-time",
      q: "How much of my time does it take?",
      a: "A 45-minute interview. Reading each document and script, and answering within 3 days. About 4 filming sessions for 24 episodes. Two 15-minute calls, in week 4 and in week 8. Editing and posting are yours too.",
    },
    {
      id: "q-film",
      q: "Do you film, edit or post for me?",
      a: "No. We write what to say and what to show. You film on your phone, with a one-page guide. You, or someone who helps you, edit and post.",
    },
    {
      id: "q-camera",
      q: "I am not comfortable on camera.",
      a: "That is fine, as long as you are willing to film. Every script is written with the words you use, to be said out loud. The shot list tells you where to stand and what to show. A line you would say to a client is easier to say than one you invent in front of a camera.",
    },
    {
      id: "q-field",
      q: "Do you work with my field?",
      a: "If you sell a service or your expertise with your own face, yes. The season comes from your story, whatever your field.",
    },
    {
      id: "q-fit",
      q: "What if we are not a fit?",
      a: "We say so on the call, and why. You keep your Show Audit either way.",
    },
    {
      id: "q-results",
      q: "Can you guarantee followers or clients?",
      a: "No, and be careful with anyone who does. We control the writing. You control the filming and the posting. So we guarantee the writing: a full refund on the first delivery, then unlimited rewrites during the 12 weeks.",
    },
    {
      id: "q-after",
      q: "What happens after the 12 weeks?",
      a: "You keep everything: the strategy, the look, the plan and every script. If you want more episodes, a Season Two can be built on them. It is not on sale yet.",
    },
  ],
};

export const apply = {
  kicker: "Apply",
  h2: "Apply for Season One.",
  body: "Tell us your name and email. Then 8 short questions, about 3 minutes. Then we talk for 15 minutes. Your Show Audit is ready before the call, and you leave with it.",
  notes: ["No payment on this page.", "You see the work before you pay."],
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
