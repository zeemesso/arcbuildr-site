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

// The application: every apply button opens the same form.
// A page that starts the form itself (the page after a booking) says so.
// If the form cannot start, the page goes on: the two fields then post by themselves (POST /api/apply).
try {
  if (!root.hasAttribute("data-own-form")) startApplication();
} catch {
  /* As above. */
}

// The first screen's trail (tight.css): soft square pixels on a grid where the pointer has been, each
// fading out. On a touch screen it drifts by itself, slowly. With reduced motion it stands still.
const trail = document.querySelector<HTMLElement>("[data-trail]");
if (trail) {
  const first = trail.parentElement!;
  let cell = 1;
  const measure = () => (cell = parseFloat(getComputedStyle(trail).fontSize) || 48);
  measure();
  addEventListener("resize", measure);
  const dot = (x: number, y: number, tone = (Math.random() * 5) | 0) => {
    const square = document.createElement("i");
    square.className = `t${tone}`;
    square.style.cssText = `--x:${x};--y:${y}`;
    trail.appendChild(square);
  };
  let last = "";
  /** One step of the trail at a point of the first screen: its cell, and now and then a neighbour. */
  const put = (left: number, top: number) => {
    const x = Math.floor(left / cell);
    const y = Math.floor(top / cell);
    if (last === (last = `${x},${y}`) || trail.childElementCount > 80) return;
    dot(x, y);
    if (Math.random() < 0.55) dot(x + (Math.random() < 0.5 ? 1 : -1), y);
    if (Math.random() < 0.35) dot(x, y + (Math.random() < 0.5 ? 1 : -1));
  };
  trail.addEventListener("animationend", (event) => (event.target as Element).remove());
  if (calm) {
    // A few squares at the two sides, placed once.
    trail.classList.add("trail--still");
    const across = Math.floor(trail.clientWidth / cell) - 1;
    const down = Math.floor(trail.clientHeight / cell) - 1;
    [
      0.02, 0.2, 0.06, 0.32, 0.12, 0.32, 0.97, 0.16, 0.92, 0.26, 0.97, 0.26, 0.1, 0.72, 0.9, 0.66,
    ].forEach(
      (part, k, all) =>
        k % 2 || dot(Math.round(part * across), Math.round(all[k + 1]! * down), (k / 2) % 5),
    );
  } else if (matchMedia("(hover: none)").matches) {
    let shown = false;
    let turn = 0;
    new IntersectionObserver(([entry]) => (shown = entry!.isIntersecting)).observe(first);
    setInterval(() => {
      if (!shown || document.hidden) return;
      turn += 0.11;
      put(
        trail.clientWidth * (0.5 + 0.44 * Math.sin(turn)),
        trail.clientHeight * (0.36 + 0.3 * Math.sin(turn * 1.7 + 1)),
      );
    }, 240);
  } else {
    first.addEventListener("pointermove", (event) => {
      const box = trail.getBoundingClientRect();
      put(event.clientX - box.left, event.clientY - box.top);
    });
  }
}

// The moving screens. A figure with data-loop plays while it is on screen:
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
  /** With few pieces the whole row is on screen: there is nothing to step to, and nothing to pause. */
  const fits = () => row.scrollWidth <= row.clientWidth + 4;
  const sync = () => {
    clearInterval(timer);
    pause.hidden = calm || fits();
    if (!calm && !fits() && !paused && !held && seenNow && !document.hidden)
      timer = window.setInterval(step, STEP);
  };
  if (!calm) {
    new ResizeObserver(sync).observe(row);
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

// The sales video. On arrival it plays without sound, under one button that turns the sound on and
// starts it from the top. Where a browser will not start it, the poster's play button does. Either way
// the player's own controls take over from there.
const vsl = document.querySelector<HTMLElement>("[data-vsl]");
const film = vsl?.querySelector<HTMLVideoElement>("[data-vsl-video]");
if (vsl && film) {
  const sound = vsl.querySelector<HTMLButtonElement>("[data-vsl-sound]");
  const silent = (on: boolean) => {
    film.muted = film.loop = on;
    film.controls = !on;
    vsl.classList.toggle("is-silent", on);
    if (sound) sound.hidden = !on;
  };
  const start = () => {
    silent(false);
    vsl.classList.add("is-playing");
    film.currentTime = 0;
    film.focus({ preventScroll: true });
    // A browser may refuse to start a video; its controls are showing by then, so nothing is lost.
    film.play().catch(() => {});
  };
  vsl.querySelector("[data-vsl-play]")?.addEventListener("click", start);
  sound?.addEventListener("click", start);
  const saving = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData;
  if (sound && !saving && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    film.muted = film.loop = true;
    film.controls = false;
    film.play().then(
      () => {
        silent(true);
        vsl.classList.add("is-playing");
      },
      () => silent(false),
    );
  }
}
