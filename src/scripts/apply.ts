// The application form: one question per screen, in a layer on the page that opened it.
// One swappable part: a page gives it the markup (components/application/Application.astro), a save function
// and a booking address. src/scripts/application.ts is the only file that calls it.
// No words live here; the markup carries them. Motion follows the 20 rules (numbers in comments).

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
};
export type ApplyOptions = {
  /** Saves the answers. Must reject when they were not saved. */
  save: (data: ApplyData, signal: AbortSignal) => Promise<void>;
  /** The booking page for this person, with name and email filled. Left out when they have already booked. */
  booking?: (who: { name: string; email: string }) => string;
  /** Called after a save when there is no booking page to go to: the layer closes and the page takes over. */
  done?: () => void;
  /** Name and email the page already knows (a booking made from a chat). */
  seed?: { name: string; email: string };
  /**
   * Puts the calendar inside `into`, with the name and email filled. `failed` is called when it cannot load;
   * the form then shows a link to `booking` instead. With a calendar, nobody is sent to another site.
   */
  calendar?: (into: HTMLElement, who: { name: string; email: string }, failed: () => void) => void;
  /** Called once, the first time the form holds a valid name and email (the page's own "opened" beacon). */
  opened?: (who: { name: string; email: string }) => void;
};

type Field = HTMLInputElement | HTMLTextAreaElement;
type Saved = {
  v: 1;
  id: string;
  /** The email these answers belong to. Another email on the same device starts clean. */
  owner: string;
  name: string;
  email: string;
  answers: Record<string, string>;
  step: number;
  at: number;
  /** True when the person went on to book although the answers were not saved yet. */
  pending?: boolean;
};

const KEY = "arcbuildr-application";
const DONE = "arcbuildr-application-done";
/** What the person saw after saving, in this visit: "end" (no calendar) or "calendar". */
const OUTCOME = "arcbuildr-application-outcome";
const HASH = "#apply";
const OUT = "cubic-bezier(0.23, 1, 0.32, 1)"; // 1: entrances ease out.
const INOUT = "cubic-bezier(0.4, 0, 0.2, 1)"; // 9: moves between two places.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLOW_MS = 8000;
const GIVE_UP_MS = 20000;
const KEEP_MS = 30 * 864e5;

/** Read fresh each time: the connection can drop while the answers are on their way. */
const isOffline = () => navigator.onLine === false;
const newId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const fresh = (): Saved => ({
  v: 1,
  id: newId(),
  owner: "",
  name: "",
  email: "",
  answers: {},
  step: -1,
  at: Date.now(),
});

/** The answers someone typed before booking without a save, if any are still on this device. */
export function pendingApplication(): Omit<ApplyData, "tz" | "page" | "sent_at" | "trap"> | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as Saved | null;
    if (!raw || raw.v !== 1 || !raw.pending || !EMAIL.test(raw.email.trim())) return null;
    return {
      id: raw.id,
      name: raw.name.trim(),
      email: raw.email.trim(),
      answers: Object.fromEntries(
        Object.entries(raw.answers).map(([key, value]) => [key, value.trim()]),
      ),
    };
  } catch {
    return null;
  }
}
/** Called once the pending answers are in the sheet. */
export function clearApplication() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* Storage may be off. */
  }
}

export function initApply(options: ApplyOptions) {
  const found = document.querySelector<HTMLElement>("[data-apply]");
  if (!found) return;
  const layer: HTMLElement = found;
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
    layer.querySelector<T>(selector)!;
  const words = JSON.parse($("[data-apply-words]").textContent || "{}") as {
    hi: string;
    again: string;
    next: string;
    finish: string;
    finishShort: string;
    errName: string;
    errEmail: string;
    send: Record<
      | "busy"
      | "done"
      | "saving"
      | "savingShort"
      | "slow"
      | "failed"
      | "offline"
      | "retry"
      | "booked",
      string
    >;
  };
  const root = document.documentElement;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const vv = window.visualViewport;
  const sheet = $(".apply__sheet");
  const form = $<HTMLFormElement>("[data-apply-form]");
  const stage = $("[data-apply-stage]");
  const steps = [...layer.querySelectorAll<HTMLElement>("[data-step]")];
  const WHO = steps.filter((step) => step.dataset.who).length;
  const total = steps.length - WHO;
  const last = steps.length - 1;
  const hi = $("[data-hi]");
  const ok = $<HTMLButtonElement>("[data-ok]");
  const okLabel = $("[data-ok-label]");
  const backButton = $<HTMLButtonElement>("[data-back]");
  const closeButton = $<HTMLButtonElement>("[data-close]");
  const note = $("[data-note]");
  const anyway = $<HTMLAnchorElement>("[data-anyway]");
  const bar = $("[data-bar]");
  const count = $("[data-count]");
  const countWrap = $("[data-count-wrap]");
  const meter = $("[role=progressbar]");
  const outside = [...document.body.children].filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el !== layer && el.tagName !== "SCRIPT",
  );
  const entries = [...document.querySelectorAll<HTMLFormElement>("[data-apply-entry]")];
  const trap = layer.querySelector<HTMLInputElement>("[data-trap]");
  const afterWrap = layer.querySelector<HTMLElement>("[data-apply-after]");
  const endPanel = layer.querySelector<HTMLElement>("[data-apply-end]");
  const calPanel = layer.querySelector<HTMLElement>("[data-apply-calendar]");

  // ---- What was typed stays on this device until the sheet has it. ----
  let state = fresh();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as Saved | null;
    if (raw && raw.v === 1 && Date.now() - raw.at < KEEP_MS) state = raw;
  } catch {
    /* Storage can be switched off. The form still works; only a refresh starts again. */
  }
  const keep = () => {
    try {
      state.at = Date.now();
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* As above. */
    }
  };
  const bookedAs = () => {
    try {
      return sessionStorage.getItem(DONE) || "";
    } catch {
      return "";
    }
  };
  // A page that already knows who this is starts at the first question.
  const seed = options.seed;
  if (seed && EMAIL.test(seed.email)) {
    if (state.owner !== seed.email.toLowerCase()) state = fresh();
    state.email = seed.email;
    state.owner = seed.email.toLowerCase();
    if (seed.name && !state.name.trim()) state.name = seed.name;
    keep();
  } else if (seed?.name && !state.name.trim()) state.name = seed.name;
  const who = () => ({ name: state.name.trim(), email: state.email.trim() });
  /** A budget under the lowest price: the answers are saved, and no calendar is offered. */
  const tooLow = () =>
    !!endPanel && state.answers[endPanel.dataset.id || ""] === endPanel.dataset.option;
  const outcome = () => {
    try {
      return sessionStorage.getItem(OUTCOME) || "";
    } catch {
      return "";
    }
  };
  const hasAnswers = () => Object.values(state.answers).some((value) => value.trim() !== "");

  let at = -1;
  let open = false;
  let busy = false;
  let failed = false;
  let finished = false;
  let greeted = false;
  let told = false;
  let pointerAt = 0;
  let pageY = 0;
  let origin: HTMLElement | null = null;
  let returnTo: HTMLElement | null = null;
  let abort: AbortController | null = null;
  let timers: number[] = [];

  const fieldOf = (i: number) => steps[i].querySelector<Field>("[data-field]");
  const radiosOf = (i: number) => [
    ...steps[i].querySelectorAll<HTMLInputElement>("input[type=radio]"),
  ];
  function valueOf(i: number) {
    const step = steps[i];
    if (step.dataset.who === "name") return state.name;
    if (step.dataset.who === "email") return state.email;
    return state.answers[step.dataset.id || ""] || "";
  }
  function validAt(i: number) {
    const step = steps[i];
    const value = valueOf(i).trim();
    if (step.dataset.who === "email") return EMAIL.test(value);
    // An answer kept from an earlier visit only counts while the form still offers it.
    if (step.dataset.type === "choice") return radiosOf(i).some((radio) => radio.value === value);
    return value !== "";
  }
  const firstOpen = () => {
    const i = steps.findIndex((_, k) => !validAt(k));
    return i < 0 ? last : i;
  };
  /** Where to begin: the question they were on, never past the first one still empty. */
  function startIndex() {
    const first = firstOpen();
    const low = Math.min(first, WHO);
    return Math.min(Math.max(state.step, low), first);
  }
  const grow = (area: HTMLTextAreaElement) => {
    area.style.height = "auto";
    area.style.height = `${Math.min(area.scrollHeight, 168)}px`;
  };
  function paint() {
    steps.forEach((_, i) => {
      const value = valueOf(i);
      const field = fieldOf(i);
      if (field) {
        field.value = value;
        if (field instanceof HTMLTextAreaElement) grow(field);
      } else for (const radio of radiosOf(i)) radio.checked = radio.value === value;
    });
    for (const entry of entries) {
      const name = entry.elements.namedItem("name");
      const email = entry.elements.namedItem("email");
      if (name instanceof HTMLInputElement && state.name.trim()) name.value = state.name;
      if (email instanceof HTMLInputElement && state.email.trim()) email.value = state.email;
    }
  }
  /** Answers are kept under the email that gave them: a new email on this device starts clean. */
  function claim() {
    const email = state.email.trim().toLowerCase();
    if (state.owner && state.owner !== email && hasAnswers()) {
      state.answers = {};
      state.id = newId();
      state.pending = false;
    }
    state.owner = email;
    keep();
    paint();
    if (!told) {
      told = true;
      options.opened?.(who());
    }
  }

  // ---- The layer sizes itself to the part of the screen the keyboard leaves free. ----
  function reveal(el: HTMLElement | null) {
    if (!el) return;
    const frame = stage.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    if (box.bottom > frame.bottom) stage.scrollTop += box.bottom - frame.bottom + 12;
    else if (box.top < frame.top) stage.scrollTop -= frame.top - box.top + 12;
  }
  function fit() {
    if (!open) return;
    const height = vv ? vv.height : innerHeight;
    layer.style.setProperty("--apply-h", `${height}px`);
    layer.style.setProperty("--apply-top", `${vv ? vv.offsetTop : 0}px`);
    layer.classList.toggle("is-tight", height < 520);
    const active = document.activeElement;
    if (active instanceof HTMLElement && stage.contains(active)) reveal(active);
  }
  vv?.addEventListener("resize", fit);
  vv?.addEventListener("scroll", fit);
  addEventListener("resize", fit);

  // ---- Small parts ----
  /** 16, 18: the old label and the new one overlap, crossfading with a little blur. */
  function relabel(text: string) {
    if (okLabel.textContent === text) return;
    if (calm || !open) {
      okLabel.textContent = text;
      return;
    }
    const old = okLabel.cloneNode(true) as HTMLElement;
    old.removeAttribute("data-ok-label");
    old.classList.add("is-old");
    old.setAttribute("aria-hidden", "true");
    ok.appendChild(old);
    okLabel.textContent = text;
    const gone = () => old.remove();
    old
      .animate(
        [
          { opacity: 1, filter: "blur(0px)" },
          { opacity: 0, filter: "blur(3px)" },
        ],
        { duration: 128, easing: INOUT, fill: "forwards" },
      )
      .finished.then(gone, gone);
    okLabel.animate(
      [
        { opacity: 0, filter: "blur(3px)" },
        { opacity: 1, filter: "blur(0px)" },
      ],
      { duration: 160, easing: OUT },
    );
  }
  function say(text: string, alarm = false) {
    const changed = note.textContent !== text;
    note.textContent = text;
    note.classList.toggle("is-alarm", alarm);
    if (text && changed && !calm)
      note.animate(
        [
          { opacity: 0, transform: "translateY(4px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 200, easing: OUT },
      );
  }
  function greet(kind: "hi" | "again" | "none") {
    const first = state.name.trim().split(/\s+/)[0] || "";
    hi.textContent =
      kind === "again"
        ? words.again
        : kind === "hi" && first
          ? words.hi.replace("{name}", first)
          : "";
  }
  function clearError(i: number) {
    const step = steps[i];
    const error = step.querySelector<HTMLElement>("[data-err]");
    if (error) error.hidden = true;
    step.classList.remove("has-err");
    fieldOf(i)?.removeAttribute("aria-invalid");
  }
  /** The reason sits next to the field, in plain words, and the field takes the cursor. */
  function showError(i: number) {
    const step = steps[i];
    const error = step.querySelector<HTMLElement>("[data-err]");
    const target = fieldOf(i) ?? radiosOf(i)[0];
    step.classList.add("has-err");
    fieldOf(i)?.setAttribute("aria-invalid", "true");
    if (error) {
      error.hidden = false;
      if (!calm)
        error.animate(
          [
            { opacity: 0, transform: "translateY(-4px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 200, easing: OUT },
        );
    }
    target?.focus({ preventScroll: true });
    reveal(error ?? target ?? null);
  }
  function unfail() {
    if (!failed) return;
    failed = false;
    anyway.hidden = true;
    say("");
  }
  function settle() {
    const n = Math.max(0, at - WHO + 1);
    bar.style.transform = `scaleX(${n / total})`;
    meter.setAttribute("aria-valuenow", String(n));
    countWrap.hidden = n < 1;
    if (n >= 1) count.textContent = String(n);
    layer.classList.toggle("is-last", at === last);
    if (!busy && !finished)
      relabel(
        failed
          ? words.send.retry
          : at !== last
            ? words.next
            : tooLow()
              ? words.finishShort
              : words.finish,
      );
  }
  function focusStep() {
    const target = fieldOf(at) ?? radiosOf(at).find((radio) => radio.checked) ?? radiosOf(at)[0];
    if (!target) return;
    // Focus is given in the same turn as the tap or key, so a phone keeps its keyboard up between questions.
    target.focus({ preventScroll: true });
    if (target.type !== "radio") {
      try {
        target.setSelectionRange(target.value.length, target.value.length);
      } catch {
        /* Email fields have no selection range. */
      }
    }
  }

  /** 16: the old screen and the new one overlap. The new one enters in 160 ms, the old one leaves 20% faster (15). */
  function show(next: number, dir: 1 | -1, moving = true) {
    const from = at >= 0 && at !== next ? steps[at] : null;
    const to = steps[next];
    if (moving && from) greet(next === WHO && !greeted && !hasAnswers() ? "hi" : "none");
    if (next >= WHO) greeted = true;
    at = next;
    state.step = next;
    keep();
    unfail();
    for (const step of steps) {
      if (step === to || step === from) continue;
      step.classList.remove("is-current", "is-leaving");
    }
    for (const running of to.getAnimations({ subtree: true })) running.cancel();
    to.classList.remove("is-leaving");
    to.classList.add("is-current");
    if (from) {
      from.classList.remove("is-current");
      if (moving && !calm) {
        from.classList.add("is-leaving");
        const end = () => from.classList.remove("is-leaving");
        from
          .animate(
            [
              { opacity: 1, transform: "none" },
              { opacity: 0, transform: `translateX(${-16 * dir}px)` },
            ],
            { duration: 128, easing: INOUT },
          )
          .finished.then(end, end);
      }
    }
    if (moving && !calm) {
      // 6, 3: the question, then the field, 30 ms apart.
      to.querySelectorAll<HTMLElement>("[data-part]").forEach((part, k) =>
        part.animate(
          [
            { opacity: 0, transform: `translateX(${16 * dir}px)` },
            { opacity: 1, transform: "none" },
          ],
          { duration: 160, delay: k * 30, easing: OUT, fill: "backwards" },
        ),
      );
    }
    stage.scrollTop = 0;
    const area = fieldOf(next);
    if (area instanceof HTMLTextAreaElement) grow(area);
    settle();
  }

  // ---- Opening and closing: the layer grows out of what was tapped, and goes back into it (10, 11, 12, 17). ----
  const depth = () => {
    const now = history.state as { depth?: number } | null;
    return now && typeof now.depth === "number" ? now.depth : 0;
  };
  const hole = (el: HTMLElement) => {
    const box = el.getBoundingClientRect();
    const height = vv ? vv.height : innerHeight;
    return `inset(${Math.max(0, box.top)}px ${Math.max(0, innerWidth - box.right)}px ${Math.max(0, height - box.bottom)}px ${Math.max(0, box.left)}px round 28px)`;
  };
  const FULL = "inset(0px 0px 0px 0px round 0px)";
  function openLayer(from: HTMLElement | null) {
    if (open) return;
    open = true;
    origin = from;
    pageY = scrollY;
    layer.hidden = false;
    root.classList.add("apply-open");
    for (const el of outside) el.inert = true;
    fit();
    if (from && !calm) {
      layer.animate([{ clipPath: hole(from) }, { clipPath: FULL }], { duration: 320, easing: OUT });
      sheet.animate(
        [
          { opacity: 0, transform: "scale(0.95)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 320, easing: OUT },
      );
    }
  }
  function closeLayer() {
    if (!open) return;
    open = false;
    if (busy) cancelSend();
    const done = () => {
      layer.hidden = true;
      root.classList.remove("apply-open");
      for (const el of outside) el.inert = false;
      if (Math.abs(scrollY - pageY) > 1) scrollTo({ top: pageY, behavior: "instant" });
      returnTo?.focus({ preventScroll: true });
    };
    if (calm || !origin || !origin.isConnected) return done();
    // 15: leaving takes 20% less time than entering.
    layer
      .animate(
        [
          { clipPath: FULL, opacity: 1 },
          { clipPath: hole(origin), opacity: 0 },
        ],
        { duration: 256, easing: INOUT },
      )
      .finished.then(done, done);
  }
  function begin(from: HTMLElement | null, focusBack: HTMLElement | null) {
    if (open) return;
    returnTo = focusBack;
    // Already saved in this visit: the layer opens on what came after, not on the questions again.
    if (finished) {
      openLayer(from);
      history.pushState({ apply: last, depth: 1 }, "", HASH);
      return leave();
    }
    const start = startIndex();
    greet(hasAnswers() ? "again" : start === WHO ? "hi" : "none");
    openLayer(from);
    history.pushState({ apply: start, depth: 1 }, "", HASH);
    show(start, 1, false);
    focusStep();
  }
  /** Closing keeps every answer; the next opening comes back to the same question. */
  function shut() {
    if (busy) return;
    const pushed = depth();
    if (pushed > 0) history.go(-pushed);
    else {
      history.replaceState(null, "", location.pathname + location.search);
      closeLayer();
    }
  }
  /** What comes after the questions, in the same layer: the calendar, or the lines that end the form. */
  let mounted = false;
  function after(kind: "end" | "calendar") {
    if (!afterWrap || !endPanel || !calPanel) return;
    lock(false);
    if (!open) {
      openLayer(null);
      history.pushState({ apply: last, depth: 1 }, "", HASH);
    }
    form.hidden = true;
    afterWrap.hidden = false;
    layer.classList.add("is-after");
    layer.classList.toggle("is-calendar", kind === "calendar");
    endPanel.hidden = kind !== "end";
    calPanel.hidden = kind !== "calendar";
    if (kind === "end") {
      const first = state.name.trim().split(/\s+/)[0] || "";
      for (const line of endPanel.querySelectorAll<HTMLElement>("[data-line]"))
        line.textContent = (line.dataset.line || "")
          .replace(first ? "{name}" : ", {name}", first)
          .replace("{name}", first);
      closeButton.disabled = false;
      closeButton.focus({ preventScroll: true });
      return;
    }
    calPanel.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    if (mounted || !options.calendar) return;
    mounted = true;
    const link = calPanel.querySelector<HTMLAnchorElement>("[data-calendar-link]");
    options.calendar(calPanel.querySelector<HTMLElement>("[data-calendar]")!, who(), () => {
      if (!link || !options.booking) return;
      link.href = options.booking(who());
      link.hidden = false;
    });
  }
  const leave = () => {
    if (endPanel && (tooLow() || outcome() === "end")) return after("end");
    if (options.calendar && calPanel) return after("calendar");
    const booking = options.booking;
    if (booking) return location.assign(booking(who()));
    shut();
    options.done?.();
  };

  // ---- Saving: once, at the end. ----
  function lock(on: boolean) {
    layer.classList.toggle("is-busy", on);
    form.setAttribute("aria-busy", String(on));
    backButton.disabled = on;
    closeButton.disabled = on;
    if (on) ok.focus({ preventScroll: true });
    stage.inert = on;
  }
  function stopTimers() {
    for (const timer of timers) clearTimeout(timer);
    timers = [];
  }
  function cancelSend() {
    busy = false;
    stopTimers();
    abort?.abort();
    lock(false);
    say("");
  }
  function fail(offline: boolean) {
    failed = true;
    say(offline ? words.send.offline : words.send.failed, true);
    relabel(words.send.retry);
    if (options.booking) anyway.href = options.booking(who());
    // No way round to the calendar for a budget under the lowest price.
    anyway.hidden = offline || !options.booking || tooLow();
    ok.focus({ preventScroll: true });
    if (offline)
      addEventListener(
        "online",
        () => {
          if (failed && open && !busy) void send();
        },
        { once: true },
      );
  }
  async function send() {
    if (busy || finished) return;
    unfail();
    if (isOffline()) return fail(true);
    busy = true;
    lock(true);
    relabel(words.send.busy);
    say(tooLow() ? words.send.savingShort : words.send.saving);
    const control = new AbortController();
    abort = control;
    timers = [
      window.setTimeout(() => say(words.send.slow), SLOW_MS),
      window.setTimeout(() => control.abort(), GIVE_UP_MS),
    ];
    const data: ApplyData = {
      id: state.id,
      ...who(),
      answers: Object.fromEntries(
        Object.entries(state.answers).map(([key, value]) => [key, value.trim()]),
      ),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      page: location.pathname,
      sent_at: new Date().toISOString(),
      trap: trap?.value ?? "",
    };
    let saved = false;
    try {
      await options.save(data, control.signal);
      saved = true;
    } catch {
      /* Handled below: the answers stay where they are. */
    }
    if (abort !== control || !busy) return; // The person went back while it was saving.
    stopTimers();
    busy = false;
    if (!saved) {
      lock(false);
      fail(isOffline());
      return;
    }
    finished = true;
    try {
      localStorage.removeItem(KEY);
      sessionStorage.setItem(DONE, state.email.trim().toLowerCase());
      sessionStorage.setItem(OUTCOME, tooLow() ? "end" : "calendar");
    } catch {
      /* Storage may be off. */
    }
    relabel(words.send.done);
    ok.classList.add("is-sent"); // 8: one pulse.
    window.setTimeout(leave, calm ? 0 : 400);
  }

  function forward() {
    if (finished) return leave();
    if (busy) return;
    if (failed && at === last) return void send();
    if (!validAt(at)) return showError(at);
    if (steps[at].dataset.who && steps.slice(0, WHO).every((_, i) => validAt(i))) {
      // Already applied in this visit with this email: no second form.
      if (at === WHO - 1 && bookedAs() === state.email.trim().toLowerCase()) {
        finished = true;
        return leave();
      }
      claim();
    }
    if (at === last) return void send();
    const next = at + 1;
    history.pushState({ apply: next, depth: depth() + 1 }, "", HASH);
    show(next, 1);
    focusStep();
  }
  function back() {
    if (busy) return;
    if (depth() > 0) return history.back();
    if (at > 0) {
      history.replaceState({ apply: at - 1, depth: 0 }, "", HASH);
      show(at - 1, -1);
      focusStep();
    } else shut();
  }

  // ---- Listening ----
  form.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    const i = steps.findIndex((step) => step.contains(target));
    if (i < 0) return;
    const step = steps[i];
    if (step.dataset.who === "name") state.name = target.value;
    else if (step.dataset.who === "email") state.email = target.value.trim();
    else state.answers[step.dataset.id || ""] = target.value;
    keep();
    clearError(i);
    unfail();
    if (target instanceof HTMLTextAreaElement) grow(target);
    if (!busy && !finished) settle();
  });
  stage.addEventListener("pointerdown", () => {
    pointerAt = performance.now();
  });
  // A tapped choice moves on at once. A choice changed with the arrow keys waits for Enter.
  form.addEventListener("change", (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement &&
      target.type === "radio" &&
      performance.now() - pointerAt < 800
    )
      forward();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    forward();
  });
  backButton.addEventListener("click", back);
  closeButton.addEventListener("click", shut);
  anyway.addEventListener("click", () => {
    state.pending = true;
    keep();
  });
  layer.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    const target = event.target as HTMLElement;
    if (event.key === "Escape") return shut();
    if (event.key === "Enter") {
      if (target.closest("[data-back], [data-close], [data-anyway]")) return;
      if (target instanceof HTMLTextAreaElement && event.shiftKey) return;
      event.preventDefault();
      forward();
      return;
    }
    // A letter picks a choice and moves on.
    if (busy || finished || steps[at]?.dataset.type !== "choice") return;
    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
    const radio = radiosOf(at)[event.key.toUpperCase().charCodeAt(0) - 65];
    if (!radio) return;
    event.preventDefault();
    radio.checked = true;
    radio.dispatchEvent(new Event("input", { bubbles: true }));
    forward();
  });
  addEventListener("popstate", (event) => {
    const now = event.state as { apply?: number } | null;
    if (now && typeof now.apply === "number" && steps[now.apply]) {
      if (busy) cancelSend();
      // After the answers are saved, Back leaves the layer in one step.
      if (finished) {
        const pushed = depth();
        if (pushed > 0) history.go(-pushed);
        return;
      }
      const target = Math.min(now.apply, firstOpen());
      if (!open) openLayer(null);
      show(target, target < at ? -1 : 1);
      focusStep();
    } else closeLayer();
  });
  // Back from the booking page: the answers are in, so the button only goes to the calendar again.
  addEventListener("pageshow", (event) => {
    if (!event.persisted || !finished) return;
    lock(false);
    ok.classList.remove("is-sent");
    say("");
    okLabel.textContent = words.send.booked;
  });

  // The two fields on the page: checked in place, then the layer opens from them.
  for (const entry of entries) {
    const name = entry.elements.namedItem("name") as HTMLInputElement;
    const email = entry.elements.namedItem("email") as HTMLInputElement;
    const errorFor = (input: HTMLInputElement) =>
      input.closest("label")?.querySelector<HTMLElement>("[data-entry-err]") ?? null;
    entry.noValidate = true;
    for (const input of [name, email]) {
      input.addEventListener("input", () => {
        input.removeAttribute("aria-invalid");
        const error = errorFor(input);
        if (error) error.textContent = "";
      });
    }
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
      state.name = name.value;
      state.email = email.value;
      // Already applied in this visit: straight to the calendar, no second form.
      if (bookedAs() === email.value.toLowerCase()) {
        finished = true;
        returnTo = entry.querySelector<HTMLElement>("button");
        return leave();
      }
      claim();
      begin(entry, entry.querySelector<HTMLElement>("button"));
    });
  }
  for (const opener of document.querySelectorAll<HTMLElement>("[data-apply-open]")) {
    opener.addEventListener("click", (event) => {
      event.preventDefault();
      begin(opener, opener);
    });
  }

  // A refresh in the middle comes back to the same question, with everything typed.
  paint();
  if (location.hash === HASH) {
    if (bookedAs()) history.replaceState(null, "", location.pathname + location.search);
    else {
      const start = startIndex();
      history.replaceState({ apply: start, depth: depth() }, "", HASH);
      greet(hasAnswers() ? "again" : start === WHO ? "hi" : "none");
      openLayer(null);
      show(start, 1, false);
      focusStep();
    }
  }
}
