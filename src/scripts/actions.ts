export {};
const top = document.querySelector<HTMLFormElement>("#top-entry");
const bottom = document.querySelector<HTMLFormElement>("#bottom-entry");
const header = document.querySelector<HTMLElement>(".top");
const onScreen = (element: Element) => {
  const r = element.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight;
};
if (top && bottom && header) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>("[data-apply]")) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      // The top form while it is on screen or still ahead; the bottom one once it is behind.
      const target = top.getBoundingClientRect().bottom > 0 ? top : bottom;
      target.querySelector<HTMLInputElement>('[name="name"]')!.focus({ preventScroll: true });
      target.scrollIntoView({
        block: "center",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    });
  }
  // One action on screen at a time: the header's button leaves while a form's button shows.
  const buttons = [top, bottom].map((form) => form.querySelector("button")!);
  const headerAction = header.querySelector("a.btn");
  const update = () => {
    const visible = buttons.some(onScreen);
    header.toggleAttribute("data-entry-visible", visible);
    headerAction?.toggleAttribute("inert", visible);
  };
  update();
  const observer = new IntersectionObserver(update);
  buttons.forEach((button) => observer.observe(button));
}
