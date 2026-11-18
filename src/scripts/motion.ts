export {};
// Sections enter once, when they come on screen. The character starts walking when half its stage shows.
const root = document.documentElement;
const seen = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      seen.unobserve(entry.target);
    }
  },
  { rootMargin: "0px 0px -12% 0px" },
);
document.querySelectorAll("[data-reveal]").forEach((element) => seen.observe(element));
const stage = document.querySelector(".stage");
if (stage) {
  const start = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      stage.closest(".season")?.classList.add("is-in");
      start.disconnect();
    },
    { threshold: 0.5 },
  );
  start.observe(stage);
}
root.classList.add("ready");
