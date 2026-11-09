// Application form questions. DRAFT wording: edit labels, help lines and options here only.
// `value` is what lands in the Google Sheet, so keep it stable once leads come in;
// `label` is what the visitor reads. The form, the server check and the sheet read this file.

export type Option = { value: string; label: string };
export type Question = { label: string; help?: string; placeholder?: string; options?: Option[] };

export const QUESTIONS = {
  name: { label: "Your name" },
  email: { label: "Email" },
  phone: {
    label: "Phone, with country code",
    help: "Start with + and your country code.",
    placeholder: "+212 6 12 34 56 78",
  },
  instagram: {
    label: "Instagram handle",
    help: "So I can look at your profile before we talk.",
    placeholder: "@",
  },
  language: {
    label: "Which language for the call?",
    options: [
      { value: "English", label: "English" },
      { value: "Darija", label: "Darija" },
      { value: "Arabic", label: "Arabic" },
    ],
  },
  channel: {
    label: "How should we talk?",
    options: [
      { value: "Phone call", label: "Phone call" },
      { value: "WhatsApp", label: "WhatsApp" },
      { value: "Google Meet", label: "Google Meet" },
    ],
  },
  budget: {
    label: "What budget do you have in mind for your personal brand?",
    help: "A rough range is enough. It helps me suggest what fits.",
    // DRAFT ranges and currency: Zyade to confirm.
    options: [
      { value: "Under $1,000", label: "Under $1,000" },
      { value: "$1,000 to $3,000", label: "$1,000 to $3,000" },
      { value: "$3,000 to $6,000", label: "$3,000 to $6,000" },
      { value: "Over $6,000", label: "Over $6,000" },
      { value: "Not sure yet", label: "Not sure yet" },
    ],
  },
  decision: {
    label: "Who makes the decision?",
    options: [
      { value: "Alone", label: "I decide alone" },
      { value: "With a partner", label: "With a partner or co-founder" },
      { value: "Someone else", label: "Someone else decides" },
    ],
  },
  need: {
    label: "What do you want your personal brand to do for your business?",
    options: [
      { value: "More clients", label: "Bring me more clients" },
      { value: "Known as the expert", label: "Make me known as the expert in my field" },
      { value: "Launch an offer", label: "Help me launch a new offer" },
      { value: "Build an audience", label: "Build an audience first" },
      { value: "Not sure yet", label: "I'm not sure yet" },
    ],
  },
  timing: {
    label: "When do you want to start?",
    options: [
      { value: "This month", label: "This month" },
      { value: "In 1 to 2 months", label: "In 1 to 2 months" },
      { value: "In 3 months or more", label: "In 3 months or more" },
      { value: "Just looking", label: "Just looking for now" },
    ],
  },
  heard: {
    label: "How did you hear about us? (optional)",
    options: [
      { value: "Instagram", label: "Instagram" },
      { value: "TikTok", label: "TikTok" },
      { value: "A friend or client", label: "A friend or client" },
      { value: "Google", label: "Google" },
      { value: "Other", label: "Other" },
    ],
  },
  referredBy: { label: "Who referred you? (optional)" },
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
