// The home page: its motion, and the door to the application.
// Rule numbers from the 20 motion rules are in the comments.
import { startApplication } from "./application";

const root = document.documentElement;
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;
const wide = matchMedia("(min-width: 64rem)");
// The first screen enters once the fonts are in, so lines do not jump.
document
  .querySelectorAll<HTMLElement>(".hero__lede .chip")
  .forEach((chip, i) => chip.style.setProperty("--c", String(i)));
const go = () => requestAnimationFrame(() => root.classList.add("ready"));
(document.fonts?.ready ?? Promise.resolve()).then(go, go);

// Sections reveal once, when they come on screen.
const seen = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      seen.unobserve(entry.target);
      if (entry.target.classList.contains("hub")) runWires();
    }
  },
  { rootMargin: "0px 0px -18% 0px", threshold: 0.12 },
);
document.querySelectorAll("[data-reveal]").forEach((el) => seen.observe(el));

// One action on screen at a time: the header button appears once the first form has left the screen,
// and steps back while the form at the end of the page is in view (11, 12, 15 in CSS).
const bar = document.querySelector(".bar");
const entries = [...document.querySelectorAll(".entry")];
if (bar && entries.length) {
  const inView = new Set<Element>();
  let passed = false;
  const watch = new IntersectionObserver((changes) => {
    for (const change of changes) {
      if (change.isIntersecting) inView.add(change.target);
      else inView.delete(change.target);
      if (change.target === entries[0])
        passed = !change.isIntersecting && change.boundingClientRect.top < 0;
    }
    bar.classList.toggle("has-cta", passed && inView.size === 0);
  });
  entries.forEach((el) => watch.observe(el));
}

// The application: the two fields and the header button open it.
startApplication();

// Cursor trail on the first screen: soft squares in the brand colours that fade where the pointer passed.
const trail = document.querySelector<HTMLElement>(".hero__trail");
const hero = document.querySelector<HTMLElement>(".hero");
if (trail && hero && fine && !calm) {
  const colours = ["--trail-1", "--trail-2", "--trail-3", "--trail-4"].map((name) =>
    getComputedStyle(root).getPropertyValue(name).trim(),
  );
  const cell = 40;
  let last = { x: -999, y: -999 };
  let n = 0;
  let queued: PointerEvent | null = null;
  const spawn = () => {
    const event = queued;
    queued = null;
    if (!event) return;
    const box = hero.getBoundingClientRect();
    const x = Math.round((event.clientX - box.left) / cell) * cell;
    const y = Math.round((event.clientY - box.top) / cell) * cell;
    if (Math.hypot(x - last.x, y - last.y) < cell) return;
    last = { x, y };
    const dot = document.createElement("i");
    dot.style.left = `${x - 24}px`;
    dot.style.top = `${y - 24}px`;
    dot.style.background = colours[n++ % colours.length] || "currentColor";
    trail.appendChild(dot);
    if (trail.childElementCount > 36) trail.firstElementChild?.remove();
    dot
      .animate(
        [
          { opacity: 0.95, scale: 1 },
          { opacity: 0, scale: 0.55 },
        ],
        { duration: 800, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" },
      )
      .finished.then(
        () => dot.remove(),
        () => dot.remove(),
      );
  };
  hero.addEventListener("pointermove", (event) => {
    if (event.buttons) return; // 14: nothing animates while held.
    if (!queued) requestAnimationFrame(spawn);
    queued = event;
  });
}

// The diagram's wires: curves from each document into the hub, and from the hub to each use (7).
const map = document.querySelector<HTMLElement>("[data-map]");
const svg = map?.querySelector<SVGSVGElement>(".hub__wires");
const group = svg?.querySelector("g");
const core = map?.querySelector<HTMLElement>("[data-core]");
const inputs = map ? [...map.querySelectorAll<HTMLElement>("[data-from]")] : [];
const outputs = map ? [...map.querySelectorAll<HTMLElement>("[data-to]")] : [];
const ns = "http://www.w3.org/2000/svg";
let ran = false;

function point(el: HTMLElement, side: "left" | "right" | "top" | "bottom") {
  const m = map!.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const x =
    { left: r.left, right: r.right, top: r.left + r.width / 2, bottom: r.left + r.width / 2 }[
      side
    ] - m.left;
  const y =
    { left: r.top + r.height / 2, right: r.top + r.height / 2, top: r.top, bottom: r.bottom }[
      side
    ] - m.top;
  return { x, y };
}

function curve(a: { x: number; y: number }, b: { x: number; y: number }, across: boolean) {
  if (across) {
    const k = (b.x - a.x) * 0.55;
    return `M${a.x},${a.y} C${a.x + k},${a.y} ${b.x - k},${b.y} ${b.x},${b.y}`;
  }
  const k = (b.y - a.y) * 0.55;
  return `M${a.x},${a.y} C${a.x},${a.y + k} ${b.x},${b.y - k} ${b.x},${b.y}`;
}

function drawWires() {
  if (!map || !group || !core) return;
  const across = wide.matches;
  group.replaceChildren();
  const make = (d: string, i: number, out: boolean) => {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    path.setAttribute("pathLength", "1");
    path.style.setProperty("--w", String(i));
    if (out) path.classList.add("out");
    group.appendChild(path);
    return path;
  };
  inputs.forEach((el, i) =>
    make(
      curve(point(el, across ? "right" : "bottom"), point(core, across ? "left" : "top"), across),
      i,
      false,
    ),
  );
  outputs.forEach((el, i) =>
    make(
      curve(point(core, across ? "right" : "bottom"), point(el, across ? "left" : "top"), across),
      i,
      true,
    ),
  );
}

// The diagram is still: its lines draw in once, and the profile fills when they land (6, 17).
function runWires() {
  if (ran || !core) return;
  ran = true;
  const fill = () => core.classList.add("is-on");
  if (calm) fill();
  else setTimeout(fill, 1150);
}

if (map) {
  drawWires();
  new ResizeObserver(() => drawWires()).observe(map);
  wide.addEventListener("change", drawWires);
}

// Feature screens (L1-P9): a figure with data-loop plays its steps while it is on screen.
// Each [data-at] element gets class "on" at its time (ms into the loop). Near the end the steps are
// cleared, so the next loop starts from the empty state. Reduced motion and no-JS show the finished state (CSS).
const loops = document.querySelectorAll<HTMLElement>("[data-loop]");
if (!calm && loops.length) {
  const looping = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const figure = entry.target as HTMLElement;
        if (entry.isIntersecting) play(figure);
        else stop(figure);
      }
    },
    { threshold: 0.35 },
  );
  const runs = new Map<HTMLElement, { timers: number[]; loop: number }>();
  const play = (figure: HTMLElement) => {
    if (runs.has(figure)) return;
    const length = Number(figure.dataset.loop) || 10000;
    const steps = [...figure.querySelectorAll<HTMLElement>("[data-at]")];
    figure.classList.add("is-looping");
    const cycle = () => {
      const timers: number[] = [];
      for (const step of steps)
        timers.push(window.setTimeout(() => step.classList.add("on"), Number(step.dataset.at)));
      timers.push(
        window.setTimeout(() => steps.forEach((step) => step.classList.remove("on")), length - 600),
      );
      const run = runs.get(figure);
      if (!run) return;
      run.timers = timers;
      run.loop = window.setTimeout(cycle, length);
    };
    runs.set(figure, { timers: [], loop: 0 });
    cycle();
  };
  const stop = (figure: HTMLElement) => {
    const run = runs.get(figure);
    if (!run) return;
    run.timers.forEach(clearTimeout);
    clearTimeout(run.loop);
    runs.delete(figure);
    figure.querySelectorAll(".on").forEach((step) => step.classList.remove("on"));
    figure.classList.remove("is-looping");
  };
  loops.forEach((figure) => looping.observe(figure));
}

// Tabs: one panel shows. The marker slides from the old tab to the new one (9, 20).
for (const tabs of document.querySelectorAll<HTMLElement>("[data-tabs]")) {
  const list = tabs.querySelector<HTMLElement>("[role=tablist]")!;
  const thumb = tabs.querySelector<HTMLElement>(".tabs__thumb");
  const buttons = [...tabs.querySelectorAll<HTMLButtonElement>("[role=tab]")];
  const place = () => {
    const on = buttons.find((button) => button.getAttribute("aria-selected") === "true");
    if (!on || !thumb) return;
    thumb.style.width = `${on.offsetWidth}px`;
    thumb.style.translate = `${on.offsetLeft}px 0`;
  };
  const pick = (button: HTMLButtonElement, focus: boolean) => {
    for (const other of buttons) {
      const on = other === button;
      other.setAttribute("aria-selected", String(on));
      other.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(other.getAttribute("aria-controls") || "");
      if (panel) panel.hidden = !on;
    }
    place();
    if (focus) button.focus();
  };
  buttons.forEach((button, i) => {
    button.addEventListener("click", () => pick(button, false));
    button.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: buttons.length - 1 - i }[
        event.key
      ];
      if (step === undefined) return;
      event.preventDefault();
      pick(buttons[(i + step + buttons.length) % buttons.length]!, true);
    });
  });
  tabs.classList.add("is-live");
  place();
  requestAnimationFrame(() => tabs.classList.add("is-placed"));
  new ResizeObserver(place).observe(list);
}
