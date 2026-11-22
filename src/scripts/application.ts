// The application's one doorway. A page calls startApplication(); nothing else on the site knows how the
// form is built. The questions are a form on Tally, opened in Tally's popup with the name and email
// filled. When it is submitted the site takes over: the answers go to POST /api/apply, then the calendar
// opens inside the page, or the lines that end the form for a budget under the lowest price.
// Nobody is left stuck: if the popup cannot load, the same form opens as a full page; if Tally cannot be
// reached at all, the plain form (a name, an email, one button) saves and opens the calendar.
// No words live here; the markup carries them (components/application/Application.astro).
import {
  APPLICATION_AFTER_BOOKING_URL,
  APPLICATION_URL,
  BOOKED_PATH,
  BOOKING_URL,
  TALLY_FORM,
} from "../config";

export type Kind = "application" | "prep";
type Who = { name: string; email: string };
export type ApplyData = {
  /** One id per application, kept across retries, so a second try can never make a second row. */
  id: string;
  name: string;
  email: string;
  answers: Record<string, string>;
  tz: string;
  page: string;
  sent_at: string;
  /** The field no person sees. A program that fills it is not saved. */
  trap: string;
  /** A name and an email are enough, and the answers that are valid are kept. */
  plain?: boolean;
};
type Pending = Pick<ApplyData, "id" | "name" | "email" | "answers"> & { v: 2; kind: Kind };
type Words = {
  questions: { id: string; q: string }[];
  who: { id: string; q: string }[];
  tooLow: { id: string; option: string };
  errName: string;
  errEmail: string;
  send: Record<"busy" | "failed" | "offline" | "anyway" | "booked", string>;
  plainSend: string;
};
/** What Tally hands over when a form is submitted (developers.tally.so, "SubmissionPayload"). */
type Submission = {
  fields?: { title?: unknown; type?: unknown; answer?: { value?: unknown } }[];
};
type TallyApi = {
  openPopup: (form: string, options: Record<string, unknown>) => void;
  closePopup: (form: string) => void;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Answers Tally handed over that the sheet does not have yet. */
const KEY = "arcbuildr-application";
/** What the person saw after the form, in this visit: "end" (no calendar) or "calendar". */
const OUTCOME = "arcbuildr-application-outcome";
const HASH = "#apply";
const TALLY_ORIGIN = "https://tally.so";
const TALLY_SCRIPT = `${TALLY_ORIGIN}/widgets/embed.js`;
const TALLY_LOAD_MS = 8000;
const TALLY_SHOW_MS = 12000;
const query = new URLSearchParams(location.search);
const src = query.get("src") || "direct";
const utm = new URLSearchParams([...query].filter(([key]) => key.startsWith("utm_"))).toString();
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const newId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
/** Letters and digits only: a question still matches when its punctuation or spacing differs. */
const squash = (text: unknown) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
const stamp = () => ({
  tz: zone(),
  page: location.pathname,
  sent_at: new Date().toISOString(),
  trap: "",
});

/** Saves one application. Rejects unless the sheet said it has it. */
export async function saveApplication(
  data: ApplyData,
  kind: Kind,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/apply", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...data, kind, src, utm }),
    signal,
    keepalive: true,
  });
  const body = response.ok
    ? ((await response.json().catch(() => null)) as { ok?: boolean } | null)
    : null;
  if (!body || body.ok !== true) throw new Error("not saved");
}

/** One row in the leads sheet the moment someone gives a name and an email, whatever happens next. */
function opened({ name, email }: Who) {
  try {
    navigator.sendBeacon(
      "/api/lead",
      new URLSearchParams({
        name,
        email,
        src,
        tz: zone(),
        page: location.pathname,
        utm,
        sent_at: new Date().toISOString(),
      }),
    );
  } catch {
    /* A failed beacon must never stop the application from opening. */
  }
}

/** What the page after the booking reads to greet the person: kept on this device, never in the address. */
export const BOOKED_KEY = "arcbuildr-booked";

type CalApi = {
  (...args: unknown[]): void;
  q?: unknown[];
  ns?: Record<string, unknown>;
  loaded?: boolean;
};
const CAL_ORIGIN = "https://app.cal.com";
const CAL_READY_MS = 12000;

/**
 * The booking calendar, inside the page (Cal.com's inline embed, free plan). Its script loads only now,
 * after the form is sent. A finished booking sends the person to BOOKED_PATH: Cal.com's own
 * redirect is a paid feature, so the embed's booking event is what tells the page.
 */
function calendar(into: HTMLElement, who: Who, failed: () => void, picked = "") {
  const host = window as unknown as { Cal?: CalApi };
  // Cal.com's loader, written out: calls made before its script arrives wait in a queue it reads.
  const cal: CalApi =
    host.Cal ??
    (host.Cal = function (...args: unknown[]) {
      const api = host.Cal!;
      if (!api.loaded) {
        api.ns = {};
        api.q = api.q ?? [];
        const script = document.createElement("script");
        script.src = `${CAL_ORIGIN}/embed/embed.js`;
        script.addEventListener("error", failed);
        document.head.appendChild(script);
        api.loaded = true;
      }
      api.q!.push(args);
    });
  let ready = false;
  const giveUp = window.setTimeout(() => {
    if (!ready) failed();
  }, CAL_READY_MS);
  cal("init", { origin: CAL_ORIGIN });
  cal("inline", {
    elementOrSelector: into,
    calLink: new URL(BOOKING_URL).pathname.slice(1),
    config: { name: who.name, email: who.email, layout: "month_view", theme: "light" },
  });
  cal("ui", { layout: "month_view", theme: "light" });
  cal("on", {
    action: "linkReady",
    callback: () => {
      ready = true;
      clearTimeout(giveUp);
    },
  });
  cal("on", { action: "linkFailed", callback: failed });
  cal("on", {
    action: "bookingSuccessfulV2",
    callback: () => {
      try {
        sessionStorage.setItem(
          BOOKED_KEY,
          JSON.stringify({
            name: who.name.split(/\s+/)[0] || "",
            email: who.email,
            // The package whose card opened the form, when one did: the next page says which.
            package: picked,
          }),
        );
      } catch {
        /* Storage may be off: the page after the booking then greets without a name. */
      }
      // A moment on the calendar's own "confirmed" screen, then our page.
      window.setTimeout(() => location.assign(BOOKED_PATH), 900);
    },
  });
}

// ---- Answers that the sheet does not have yet stay on this device until it does. ----
function pending(): Pending | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as Pending | null;
    return raw && raw.v === 2 && EMAIL.test(raw.email) && raw.name ? raw : null;
  } catch {
    return null;
  }
}
function keep(data: Pending | null) {
  try {
    if (data) localStorage.setItem(KEY, JSON.stringify(data));
    else localStorage.removeItem(KEY);
  } catch {
    /* Storage may be off: the answers are still on Tally. */
  }
}
/** The whole application first. If the sheet refuses it, a plain row with the answers it accepts. */
async function send(data: Pending): Promise<void> {
  const body = (plain: boolean): ApplyData => ({
    id: data.id,
    name: data.name,
    email: data.email,
    answers: data.answers,
    ...stamp(),
    ...(plain ? { plain } : {}),
  });
  try {
    await saveApplication(body(false), data.kind, AbortSignal.timeout(20000));
  } catch {
    await saveApplication(body(true), data.kind, AbortSignal.timeout(20000));
  }
  keep(null);
}
/** One more try for answers that had not saved, from any page that loads later. */
export async function resendPending(): Promise<"none" | "saved" | "failed"> {
  const waiting = pending();
  if (!waiting) return "none";
  try {
    await send(waiting);
    return "saved";
  } catch {
    return "failed";
  }
}

/**
 * Reads what Tally handed over: each answer goes to its question's id, found by the question's words, or
 * by its place when the words on Tally differ. The name and email are the ones the page gave, or the
 * ones typed in the form.
 */
export function readSubmission(payload: Submission, words: Words, given: Who) {
  const fields = (payload.fields ?? []).map((field) => {
    const value = field.answer?.value;
    return {
      title: squash(field.title),
      type: String(field.type ?? ""),
      text: (Array.isArray(value) ? value.join(", ") : String(value ?? "")).trim(),
      used: false,
    };
  });
  const take = (test: (field: (typeof fields)[number]) => boolean) => {
    const found = fields.find((field) => !field.used && field.text && test(field));
    if (found) found.used = true;
    return found?.text ?? "";
  };
  const called = (name: string) => (field: { title: string }) => field.title === squash(name);
  const name = given.name || take(called("name")) || take(called(words.who[0]?.q ?? "")) || "";
  const typed =
    given.email ||
    take(called("email")) ||
    take(called(words.who[1]?.q ?? "")) ||
    take((field) => field.type === "INPUT_EMAIL");
  // Whatever else is hidden (the package), and the form's own name and email questions, are not answers.
  const asked = [...words.who.map((who) => called(who.q)), called("name"), called("email")];
  for (const field of fields)
    if (
      field.type === "HIDDEN_FIELDS" ||
      field.type === "INPUT_EMAIL" ||
      asked.some((test) => test(field))
    )
      field.used = true;
  const answers: Record<string, string> = {};
  for (const question of words.questions) answers[question.id] = take(called(question.q));
  const left = fields.filter((field) => !field.used && field.text);
  const open = words.questions.filter((question) => !answers[question.id]);
  // The words on Tally differ from ours: the questions are still asked in the same order.
  if (left.length === open.length)
    open.forEach((question, n) => (answers[question.id] = left[n]!.text));
  return { name: name.trim(), email: EMAIL.test(typed.trim()) ? typed.trim() : "", answers };
}

/** Tally's widget, loaded the first time someone opens the form. Rejects when it cannot load. */
let widget: Promise<TallyApi> | null = null;
function tally(): Promise<TallyApi> {
  const host = window as unknown as { Tally?: TallyApi };
  widget ??= new Promise<TallyApi>((resolve, reject) => {
    if (host.Tally) return resolve(host.Tally);
    const script = document.createElement("script");
    const fail = () => {
      widget = null;
      script.remove();
      reject(new Error("tally"));
    };
    const giveUp = window.setTimeout(fail, TALLY_LOAD_MS);
    script.src = TALLY_SCRIPT;
    script.async = true;
    script.addEventListener("load", () => {
      clearTimeout(giveUp);
      if (host.Tally) resolve(host.Tally);
      else fail();
    });
    script.addEventListener("error", () => {
      clearTimeout(giveUp);
      fail();
    });
    document.head.appendChild(script);
  });
  return widget;
}
/** True when Tally's own site answers at all, whatever it answers. */
const reachable = (address: string) =>
  fetch(address, { mode: "no-cors", cache: "no-store", signal: AbortSignal.timeout(5000) }).then(
    () => true,
    () => false,
  );

export function startApplication(options: { kind?: Kind; seed?: Who; done?: () => void } = {}) {
  const kind = options.kind ?? "application";
  const found = document.querySelector<HTMLElement>("[data-apply]");
  if (!found) return;
  const layer: HTMLElement = found;
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
    layer.querySelector<T>(selector);
  const words = JSON.parse($("[data-apply-words]")!.textContent || "{}") as Words;
  const root = document.documentElement;
  const outside = [...document.body.children].filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el !== layer && el.tagName !== "SCRIPT",
  );
  const form = $<HTMLFormElement>("[data-apply-form]")!;
  const plainName = $<HTMLInputElement>('[data-plain="name"]')!;
  const plainEmail = $<HTMLInputElement>('[data-plain="email"]')!;
  const plainErr = $("[data-plain-err]")!;
  const note = $("[data-note]")!;
  const ok = $<HTMLButtonElement>("[data-ok]")!;
  const anyway = $<HTMLAnchorElement>("[data-anyway]");
  const afterWrap = $("[data-apply-after]");
  const endPanel = $("[data-apply-end]");
  const calPanel = $("[data-apply-calendar]");
  const closeButton = $<HTMLButtonElement>("[data-close]")!;
  const booking = (who: Who) =>
    `${BOOKING_URL}?${new URLSearchParams({ name: who.name, email: who.email })}`;

  let who: Who = { name: options.seed?.name ?? "", email: options.seed?.email ?? "" };
  /** The name of the package whose card opened the form, when one did. */
  let picked = "";
  let shown = false;
  let returnTo: HTMLElement | null = null;
  let busy = false;

  // ---- The layer: it opens over the page, and Back or Escape closes it. ----
  function openLayer() {
    if (shown) return;
    shown = true;
    layer.hidden = false;
    root.classList.add("apply-open");
    for (const el of outside) el.inert = true;
    history.pushState({ apply: true }, "", HASH);
  }
  function closeLayer() {
    if (!shown) return;
    shown = false;
    layer.hidden = true;
    root.classList.remove("apply-open");
    for (const el of outside) el.inert = false;
    returnTo?.focus({ preventScroll: true });
  }
  const shut = () => {
    if ((history.state as { apply?: boolean } | null)?.apply) history.back();
    else closeLayer();
  };
  addEventListener("popstate", () => closeLayer());
  closeButton.addEventListener("click", shut);
  layer.addEventListener("keydown", (event) => {
    if (event.key === "Escape") shut();
  });

  /** What comes after the form, in the layer: the calendar, or the lines that end it. */
  let mounted = false;
  function after(what: "end" | "calendar") {
    if (!afterWrap || !endPanel || !calPanel) return;
    try {
      sessionStorage.setItem(OUTCOME, JSON.stringify({ what, ...who, package: picked }));
    } catch {
      /* Storage may be off. */
    }
    openLayer();
    form.hidden = true;
    afterWrap.hidden = false;
    layer.classList.add("is-after");
    layer.classList.toggle("is-calendar", what === "calendar");
    endPanel.hidden = what !== "end";
    calPanel.hidden = what !== "calendar";
    if (what === "end") {
      const first = who.name.split(/\s+/)[0] || "";
      for (const line of endPanel.querySelectorAll<HTMLElement>("[data-line]"))
        line.textContent = (line.dataset.line || "")
          .replace(first ? "{name}" : ", {name}", first)
          .replace("{name}", first);
      closeButton.focus({ preventScroll: true });
      return;
    }
    calPanel.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    if (mounted) return;
    mounted = true;
    const link = calPanel.querySelector<HTMLAnchorElement>("[data-calendar-link]");
    calendar(
      calPanel.querySelector<HTMLElement>("[data-calendar]")!,
      who,
      () => {
        if (!link) return;
        link.href = booking(who);
        link.hidden = false;
      },
      picked,
    );
  }
  /** Already applied in this visit: what they saw then, with no second form. */
  function before(): "end" | "calendar" | null {
    try {
      const seen = JSON.parse(sessionStorage.getItem(OUTCOME) || "null") as
        ({ what?: string; package?: string } & Partial<Who>) | null;
      if (!seen || (seen.what !== "end" && seen.what !== "calendar")) return null;
      if (who.email && seen.email && who.email.toLowerCase() !== seen.email.toLowerCase())
        return null;
      who = { name: who.name || seen.name || "", email: who.email || seen.email || "" };
      picked ||= String(seen.package ?? "");
      return seen.what;
    } catch {
      return null;
    }
  }

  // ---- The plain form: a name, an email and one button, when the questions cannot load. ----
  function plain() {
    openLayer();
    if (afterWrap) afterWrap.hidden = true;
    layer.classList.remove("is-after", "is-calendar");
    layer.classList.add("is-plain");
    form.hidden = false;
    plainName.value = who.name;
    plainEmail.value = who.email;
    (who.name ? (who.email ? ok : plainEmail) : plainName).focus({ preventScroll: true });
  }
  const say = (text: string) => {
    note.textContent = text;
  };
  form.noValidate = true;
  for (const input of [plainName, plainEmail])
    input.addEventListener("input", () => {
      input.removeAttribute("aria-invalid");
      plainErr.textContent = "";
    });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (busy) return;
    const name = plainName.value.trim();
    const email = plainEmail.value.trim();
    const bad = !name ? plainName : !EMAIL.test(email) ? plainEmail : null;
    if (bad) {
      plainErr.textContent = bad === plainName ? words.errName : words.errEmail;
      bad.setAttribute("aria-invalid", "true");
      bad.focus({ preventScroll: true });
      return;
    }
    who = { name, email };
    // Certainly no connection: say so, and keep what was typed.
    if (navigator.onLine === false) return say(words.send.offline);
    busy = true;
    ok.classList.add("is-busy");
    ok.setAttribute("aria-busy", "true");
    say(words.send.busy);
    const trap = $<HTMLInputElement>("[data-trap]")?.value ?? "";
    saveApplication(
      { id: newId(), name, email, answers: {}, ...stamp(), trap, plain: true },
      kind,
      AbortSignal.timeout(20000),
    )
      .then(
        () => {
          say("");
          if (kind === "prep") {
            shut();
            options.done?.();
          } else after("calendar");
        },
        () => {
          say(navigator.onLine === false ? words.send.offline : words.send.failed);
          if (anyway) anyway.hidden = false;
        },
      )
      .finally(() => {
        busy = false;
        ok.classList.remove("is-busy");
        ok.removeAttribute("aria-busy");
      });
  });
  anyway?.addEventListener("click", (event) => {
    event.preventDefault();
    who = { name: plainName.value.trim(), email: plainEmail.value.trim() };
    after("calendar");
  });

  // ---- Tally's popup, and what the site does when the form is sent. ----
  function submitted(payload: Submission, api: TallyApi) {
    const read = readSubmission(payload, words, who);
    who = { name: read.name, email: read.email };
    try {
      api.closePopup(formId);
    } catch {
      /* The popup may already be closed. */
    }
    // Without a name and an email there is no row to write: the answers are on Tally.
    if (who.name && who.email) {
      const data: Pending = { v: 2, id: newId(), ...who, answers: read.answers, kind };
      keep(data);
      void send(data).catch(() => {
        /* Kept on this device: the next page that loads tries again. */
      });
    }
    if (kind === "prep") return options.done?.();
    after(read.answers[words.tooLow.id] === words.tooLow.option ? "end" : "calendar");
  }
  /** The popup cannot be used: the same form as a full page, or the plain form when Tally is out of reach. */
  async function instead(address: string) {
    if (await reachable(address)) location.assign(address);
    else plain();
  }
  /** Each kind has its own form on Tally: the application, or the questions after a booking from a chat. */
  const formPage = kind === "prep" ? APPLICATION_AFTER_BOOKING_URL : APPLICATION_URL;
  const formId = kind === "prep" ? formPage.slice(formPage.lastIndexOf("/") + 1) : TALLY_FORM;
  /** True once Tally's frame has said anything at all: its form is on the screen. */
  let heard = false;
  addEventListener("message", (event) => {
    if (event.origin === TALLY_ORIGIN) heard = true;
  });
  let opening = false;
  async function begin(from: HTMLElement | null, extra: Record<string, string> = {}) {
    if (opening || shown) return;
    returnTo = from;
    const seen = kind === "prep" ? null : before();
    if (seen) return after(seen);
    opening = true;
    from?.setAttribute("aria-busy", "true");
    // Only what is known is handed over: the form asks for a name or an email it was not given.
    const hidden = Object.fromEntries(
      Object.entries({ name: who.name, email: who.email, ...extra }).filter(([, value]) => value),
    );
    const page = `${formPage}?${new URLSearchParams(hidden)}`;
    try {
      const api = await tally();
      // The popup opened but its form never said a word (a blocked frame): the same way out.
      heard = false;
      const watch = window.setTimeout(() => {
        if (heard) return;
        api.closePopup(formId);
        void instead(page);
      }, TALLY_SHOW_MS);
      api.openPopup(formId, {
        layout: "modal",
        width: 720,
        hiddenFields: hidden,
        onClose: () => clearTimeout(watch),
        onSubmit: (payload: Submission) => {
          clearTimeout(watch);
          submitted(payload, api);
        },
      });
    } catch {
      await instead(page);
    } finally {
      opening = false;
      from?.removeAttribute("aria-busy");
    }
  }

  // The two fields on the page: checked in place, then the form opens with them filled.
  for (const entry of document.querySelectorAll<HTMLFormElement>("[data-apply-entry]")) {
    const name = entry.elements.namedItem("name") as HTMLInputElement;
    const email = entry.elements.namedItem("email") as HTMLInputElement;
    const errorFor = (input: HTMLInputElement) =>
      input.closest("label")?.querySelector<HTMLElement>("[data-entry-err]") ?? null;
    entry.noValidate = true;
    for (const input of [name, email])
      input.addEventListener("input", () => {
        input.removeAttribute("aria-invalid");
        const error = errorFor(input);
        if (error) error.textContent = "";
      });
    entry.addEventListener("submit", (event) => {
      event.preventDefault();
      name.value = name.value.trim();
      email.value = email.value.trim();
      const bad = !name.value ? name : !EMAIL.test(email.value) ? email : null;
      if (bad) {
        const error = errorFor(bad);
        if (error) error.textContent = bad === name ? words.errName : words.errEmail;
        bad.setAttribute("aria-invalid", "true");
        bad.focus();
        return;
      }
      who = { name: name.value, email: email.value };
      if (kind !== "prep") opened(who);
      void begin(entry.querySelector<HTMLElement>("button"));
    });
  }
  // A button: the same form. A package card's button says which package it was.
  for (const opener of document.querySelectorAll<HTMLElement>("[data-apply-open]")) {
    opener.addEventListener("click", (event) => {
      event.preventDefault();
      const chosen = opener.dataset.package;
      if (chosen) picked = chosen;
      void begin(opener, chosen ? { package: chosen } : {});
    });
  }

  // Back from the form as a full page: its last screen sends people here with `apply=calendar` or
  // `apply=end`. The name and email are read once and taken out of the address.
  const back = query.get("apply");
  if (kind !== "prep" && (back === "calendar" || back === "end")) {
    const email = (query.get("email") ?? "").trim();
    who = {
      name: (query.get("name") ?? "").trim().slice(0, 200),
      email: EMAIL.test(email) && email.length <= 320 ? email : "",
    };
    history.replaceState(null, "", location.pathname);
    after(back);
  }
  // Answers from an earlier page that had not saved: one more try.
  void resendPending();
}
