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
startApplication();

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
