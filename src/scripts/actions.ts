export {};
const top = document.querySelector<HTMLFormElement>("#top-entry");
const bottom = document.querySelector<HTMLFormElement>("#bottom-entry");
const panel = document.querySelector<HTMLElement>("#apply");
const bar = document.querySelector<HTMLElement>("[data-bottom-bar]");
const onScreen = (element: Element) => {
  const r = element.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight;
};
if (top && bottom && panel && bar) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>("[data-apply]")) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const target = onScreen(top) ? top : bottom;
      target.querySelector<HTMLInputElement>('[name="name"]')!.focus({ preventScroll: true });
      target.scrollIntoView({
        block: "center",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    });
  }
  const button = top.querySelector("button")!;
  const header = document.querySelector(".site-header");
  const headerAction = header?.querySelector("a.action");
  const update = () => {
    const visible = onScreen(button);
    header?.toggleAttribute("data-entry-visible", visible);
    headerAction?.toggleAttribute("inert", visible);
    const show =
      button.getBoundingClientRect().bottom <= 0 &&
      !onScreen(top) &&
      !onScreen(bottom) &&
      !onScreen(panel);
    bar.classList.toggle("is-visible", show);
    bar.inert = !show;
    bar.setAttribute("aria-hidden", String(!show));
  };
  update();
  const observer = new IntersectionObserver(update);
  [top, bottom, panel, button].forEach((element) => observer.observe(element));
}
