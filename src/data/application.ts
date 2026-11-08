// Application form questions. DRAFT wording: edit labels, help lines and options here only.
// `value` is what lands in the Google Sheet, so keep it stable once leads come in;
// `en` and `fr` are what the visitor reads. The form, the server check and the sheet read this file.

type Text = { en: string; fr: string };
export type Option = Text & { value: string };
export type Question = { label: Text; help?: Text; placeholder?: string; options?: Option[] };

export const QUESTIONS = {
  name: { label: { en: "Your name", fr: "Votre nom" } },
  email: { label: { en: "Email", fr: "E-mail" } },
  phone: {
    label: { en: "Phone, with country code", fr: "Téléphone, avec l'indicatif du pays" },
    help: {
      en: "Start with + and your country code.",
      fr: "Commencez par + et l'indicatif de votre pays.",
    },
    placeholder: "+212 6 12 34 56 78",
  },
  instagram: {
    label: { en: "Instagram handle", fr: "Compte Instagram" },
    help: {
      en: "So I can look at your profile before we talk.",
      fr: "Pour que je regarde votre profil avant qu'on se parle.",
    },
    placeholder: "@",
  },
  language: {
    label: { en: "Which language for the call?", fr: "Dans quelle langue pour l'appel ?" },
    options: [
      { value: "English", en: "English", fr: "Anglais" },
      { value: "French", en: "French", fr: "Français" },
      { value: "Darija", en: "Darija", fr: "Darija" },
      { value: "Arabic", en: "Arabic", fr: "Arabe" },
    ],
  },
  channel: {
    label: { en: "How should we talk?", fr: "Comment préférez-vous qu'on se parle ?" },
    options: [
      { value: "Phone call", en: "Phone call", fr: "Appel téléphonique" },
      { value: "WhatsApp", en: "WhatsApp", fr: "WhatsApp" },
      { value: "Google Meet", en: "Google Meet", fr: "Google Meet" },
    ],
  },
  budget: {
    label: {
      en: "What budget do you have in mind for your personal brand?",
      fr: "Quel budget prévoyez-vous pour votre marque personnelle ?",
    },
    help: {
      en: "A rough range is enough. It helps me suggest what fits.",
      fr: "Une fourchette suffit. Ça m'aide à vous proposer ce qui convient.",
    },
    // DRAFT ranges and currency: Zyade to confirm.
    options: [
      { value: "Under $1,000", en: "Under $1,000", fr: "Moins de 1 000 $" },
      { value: "$1,000 to $3,000", en: "$1,000 to $3,000", fr: "1 000 à 3 000 $" },
      { value: "$3,000 to $6,000", en: "$3,000 to $6,000", fr: "3 000 à 6 000 $" },
      { value: "Over $6,000", en: "Over $6,000", fr: "Plus de 6 000 $" },
      { value: "Not sure yet", en: "Not sure yet", fr: "Je ne sais pas encore" },
    ],
  },
  decision: {
    label: { en: "Who makes the decision?", fr: "Qui prend la décision ?" },
    options: [
      { value: "Alone", en: "I decide alone", fr: "Je décide seul(e)" },
      {
        value: "With a partner",
        en: "With a partner or co-founder",
        fr: "Avec un(e) associé(e) ou co-fondateur",
      },
      { value: "Someone else", en: "Someone else decides", fr: "Quelqu'un d'autre décide" },
    ],
  },
  need: {
    label: {
      en: "What do you want your personal brand to do for your business?",
      fr: "Qu'attendez-vous de votre marque personnelle pour votre activité ?",
    },
    options: [
      { value: "More clients", en: "Bring me more clients", fr: "M'apporter plus de clients" },
      {
        value: "Known as the expert",
        en: "Make me known as the expert in my field",
        fr: "Me faire connaître comme l'expert de mon domaine",
      },
      {
        value: "Launch an offer",
        en: "Help me launch a new offer",
        fr: "M'aider à lancer une nouvelle offre",
      },
      {
        value: "Build an audience",
        en: "Build an audience first",
        fr: "D'abord construire une audience",
      },
      { value: "Not sure yet", en: "I'm not sure yet", fr: "Je ne sais pas encore" },
    ],
  },
  timing: {
    label: { en: "When do you want to start?", fr: "Quand voulez-vous commencer ?" },
    options: [
      { value: "This month", en: "This month", fr: "Ce mois-ci" },
      { value: "In 1 to 2 months", en: "In 1 to 2 months", fr: "Dans 1 à 2 mois" },
      { value: "In 3 months or more", en: "In 3 months or more", fr: "Dans 3 mois ou plus" },
      { value: "Just looking", en: "Just looking for now", fr: "Je me renseigne pour l'instant" },
    ],
  },
  heard: {
    label: {
      en: "How did you hear about us? (optional)",
      fr: "Comment nous avez-vous connus ? (facultatif)",
    },
    options: [
      { value: "Instagram", en: "Instagram", fr: "Instagram" },
      { value: "TikTok", en: "TikTok", fr: "TikTok" },
      { value: "A friend or client", en: "A friend or client", fr: "Un ami ou un client" },
      { value: "Google", en: "Google", fr: "Google" },
      { value: "Other", en: "Other", fr: "Autre" },
    ],
  },
  referredBy: {
    label: { en: "Who referred you? (optional)", fr: "Qui vous a recommandé ? (facultatif)" },
  },
} satisfies Record<string, Question>;

/** The multiple-choice questions a lead must answer, in form order. */
export const REQUIRED_CHOICES = [
  "language",
  "channel",
  "budget",
  "decision",
  "need",
  "timing",
] as const;

/** Stored values a question accepts. */
export const values = (q: Question) => (q.options ?? []).map((o) => o.value);
