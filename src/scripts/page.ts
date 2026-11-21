// The home page (L1-P11): its motion, and the door to the application.
import { startApplication } from "./application";

const root = document.documentElement;
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

// The first screen enters once the fonts are in, so lines do not jump.
const go = () => requestAnimationFrame(() => root.classList.add("ready"));
(document.fonts?.ready ?? Promise.resolve()).then(go, go);

// The scroll story: each section arrives once, as it comes on screen, then stays.
const seen = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      seen.unobserve(entry.target);
    }
  },
  { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
);
document.querySelectorAll("[data-reveal]").forEach((el) => seen.observe(el));

// One action on screen at a time: the header's button shows only while no other apply button is in view.
const bar = document.querySelector(".bar");
const actions = [...document.querySelectorAll("[data-cta]")];
if (bar && actions.length) {
  const inView = new Set<Element>();
  const watch = new IntersectionObserver((changes) => {
    for (const change of changes) {
      if (change.isIntersecting) inView.add(change.target);
      else inView.delete(change.target);
    }
    bar.classList.toggle("has-cta", inView.size === 0);
  });
  actions.forEach((el) => watch.observe(el));
}

// The application: every apply button opens the same form.
// A page that starts the form itself (the page after a booking) says so.
if (!root.hasAttribute("data-own-form")) startApplication();

// Live screens. A figure with data-loop plays while it is on screen:
//   data-at     the element gets "on" at this time (ms into the loop) and keeps it until the reset;
//   data-now    it gets "now" at this time, and loses it at data-until (or keeps it, with no data-until).
// Shortly before the end every class is taken off, so the next loop starts from the empty state.
// With reduced motion, and without scripts, a screen shows its finished state (CSS).
const loops = document.querySelectorAll<HTMLElement>("[data-loop]");
if (!calm && loops.length) {
  const runs = new Map<HTMLElement, number[]>();
  const clear = (figure: HTMLElement) =>
    figure.querySelectorAll(".on, .now").forEach((el) => el.classList.remove("on", "now"));
  const play = (figure: HTMLElement) => {
    if (runs.has(figure)) return;
    const length = Number(figure.dataset.loop) || 10000;
    const timers: number[] = [];
    runs.set(figure, timers);
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const cycle = () => {
      timers.length = 0;
      figure.classList.remove("is-resetting");
      for (const el of figure.querySelectorAll<HTMLElement>("[data-at]"))
        later(() => el.classList.add("on"), Number(el.dataset.at));
      for (const el of figure.querySelectorAll<HTMLElement>("[data-now]")) {
        later(() => el.classList.add("now"), Number(el.dataset.now));
        if (el.dataset.until) later(() => el.classList.remove("now"), Number(el.dataset.until));
      }
      later(() => {
        figure.classList.add("is-resetting");
        clear(figure);
      }, length - 400);
      later(cycle, length);
    };
    // The screen jumps to its empty state without moving, then the build is seen from its first frame.
    figure.classList.add("is-looping", "is-snapping");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!runs.has(figure)) return;
        figure.classList.remove("is-snapping");
        cycle();
      }),
    );
  };
  const stop = (figure: HTMLElement) => {
    runs.get(figure)?.forEach(clearTimeout);
    runs.delete(figure);
    figure.classList.remove("is-looping", "is-resetting", "is-snapping");
    clear(figure);
  };
  const looping = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const figure = entry.target as HTMLElement;
        if (entry.isIntersecting) play(figure);
        else stop(figure);
      }
    },
    { threshold: 0.3 },
  );
  loops.forEach((figure) => looping.observe(figure));
  // A hidden tab keeps no timers running.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) loops.forEach(stop);
    else
      loops.forEach((figure) => {
        looping.unobserve(figure);
        looping.observe(figure);
      });
  });
}

// The five steps: on a wide screen one tab is open at a time, and they take turns until someone picks one.
const steps = document.querySelector<HTMLElement>("[data-steps]");
if (steps) {
  const wide = matchMedia("(min-width: 64rem)");
  const items = [...steps.querySelectorAll<HTMLElement>(".steps__step")];
  const TURN = 5000;
  let turn = 0;
  let picked = false;
  const show = (index: number) => {
    steps.dataset.active = String(index + 1);
    items.forEach((item, n) => {
      const on = !wide.matches || n === index;
      item.classList.toggle("is-on", n === index);
      item.querySelector("button")?.setAttribute("aria-expanded", String(on));
    });
  };
  const rest = () => {
    clearTimeout(turn);
    steps.classList.remove("is-turning");
  };
  const run = () => {
    rest();
    if (calm || picked || !wide.matches) return;
    steps.style.setProperty("--turn", `${TURN}ms`);
    // Restart the line from empty.
    void steps.offsetWidth;
    steps.classList.add("is-turning");
    turn = window.setTimeout(() => {
      show((Number(steps.dataset.active) || 1) % items.length);
      run();
    }, TURN);
  };
  items.forEach((item, n) =>
    item.querySelector("button")?.addEventListener("click", () => {
      if (!wide.matches) return;
      picked = true;
      rest();
      show(n);
    }),
  );
  show(0);
  wide.addEventListener("change", () => show((Number(steps.dataset.active) || 1) - 1));
  new IntersectionObserver(
    ([entry]) => (entry?.isIntersecting && !document.hidden ? run() : rest()),
    { threshold: 0.4 },
  ).observe(steps);
}

// The gallery: its row steps forward about every 2.5 seconds while it is on screen, until it is paused.
const reel = document.querySelector<HTMLElement>("[data-reel]");
if (reel) {
  const row = reel.querySelector<HTMLElement>("[data-reel-row]")!;
  const pause = reel.querySelector<HTMLButtonElement>("[data-reel-pause]")!;
  const tabs = [...reel.querySelectorAll<HTMLButtonElement>("[data-reel-tab]")];
  const STEP = 2500;
  let timer = 0;
  let paused = false;
  let seenNow = false;
  let held = false;
  const step = () => {
    const card = row.querySelector<HTMLElement>("li");
    if (!card) return;
    const end = row.scrollLeft + row.clientWidth >= row.scrollWidth - 4;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 16;
    row.scrollTo({ left: end ? 0 : row.scrollLeft + card.offsetWidth + gap, behavior: "smooth" });
  };
  const sync = () => {
    clearInterval(timer);
    if (!calm && !paused && !held && seenNow && !document.hidden)
      timer = window.setInterval(step, STEP);
  };
  if (!calm) {
    pause.hidden = false;
    pause.addEventListener("click", () => {
      paused = !paused;
      pause.setAttribute("aria-pressed", String(paused));
      sync();
    });
    for (const [on, off] of [
      ["pointerenter", "pointerleave"],
      ["focusin", "focusout"],
    ] as const) {
      row.addEventListener(on, () => ((held = true), sync()));
      row.addEventListener(off, () => ((held = false), sync()));
    }
    new IntersectionObserver(([entry]) => ((seenNow = !!entry?.isIntersecting), sync()), {
      threshold: 0.35,
    }).observe(row);
    document.addEventListener("visibilitychange", sync);
  }
  // A tab brings its first piece to the front; the tab of the piece in front is the pressed one.
  const firstOf = (tab: string) => row.querySelector<HTMLElement>(`li[data-tab="${tab}"]`);
  for (const tab of tabs)
    tab.addEventListener("click", () => {
      const first = firstOf(tab.dataset.reelTab!);
      if (first)
        row.scrollTo({
          left: first.offsetLeft - row.offsetLeft,
          behavior: calm ? "auto" : "smooth",
        });
    });
  if (tabs.length)
    row.addEventListener(
      "scroll",
      () => {
        const edge = row.getBoundingClientRect().left;
        const front = [...row.querySelectorAll<HTMLElement>("li[data-tab]")].find(
          (li) => li.getBoundingClientRect().right > edge + 24,
        );
        for (const tab of tabs)
          tab.setAttribute("aria-pressed", String(tab.dataset.reelTab === front?.dataset.tab));
      },
      { passive: true },
    );
  // A piece opens larger.
  const box = document.querySelector<HTMLDialogElement>("[data-zoom-box]");
  const body = box?.querySelector<HTMLElement>("[data-zoom-body]");
  if (box && body) {
    row.addEventListener("click", (event) => {
      const opener = (event.target as HTMLElement).closest<HTMLElement>("[data-zoom]");
      if (!opener) return;
      body.replaceChildren(...[...opener.children].map((node) => node.cloneNode(true)));
      box.showModal();
    });
    box.addEventListener("click", (event) => {
      if (event.target === box || (event.target as HTMLElement).closest("[data-zoom-close]"))
        box.close();
    });
  }
}

// The iceberg: a line of the list and its band light up together, on hover, on focus, and (on a wide
// screen, where the picture stays beside the list) as the line passes the middle of the screen.
const berg = document.querySelector<HTMLElement>("[data-berg]");
if (berg) {
  const parts = [...berg.querySelectorAll<HTMLElement>("[data-band]")];
  const light = (band: string | null) => {
    berg.classList.toggle("has-hot", !!band);
    for (const part of parts) part.classList.toggle("is-hot", part.dataset.band === band);
  };
  for (const part of parts) {
    part.addEventListener("pointerenter", () => light(part.dataset.band!));
    part.addEventListener("pointerleave", () => light(null));
  }
  if (matchMedia("(min-width: 64rem)").matches) {
    const lines = parts.filter((part) => part.closest(".berg__items"));
    const middle = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((entry) => entry.isIntersecting).pop();
        if (hit) light((hit.target as HTMLElement).dataset.band!);
        else if (entries.some((entry) => entry.target.classList.contains("is-hot"))) light(null);
      },
      { rootMargin: "-46% 0px -46% 0px" },
    );
    lines.forEach((line) => middle.observe(line));
  }
}
