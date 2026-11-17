export {};
for (const form of document.querySelectorAll<HTMLFormElement>("[data-entry]")) {
  form.noValidate = true;
  const name = form.elements.namedItem("name") as HTMLInputElement;
  const email = form.elements.namedItem("email") as HTMLInputElement;
  const label = form.querySelector<HTMLElement>("[data-submit-label]")!;
  const original = label.textContent;
  let pending = false;
  for (const input of [name, email]) {
    input.addEventListener("input", () => {
      input.removeAttribute("aria-invalid");
      document.getElementById(`${input.id}-error`)!.hidden = true;
    });
  }
  form.addEventListener("submit", (event) => {
    if (pending) {
      event.preventDefault();
      return;
    }
    name.value = name.value.trim();
    email.value = email.value.trim();
    let first: HTMLInputElement | undefined;
    for (const [input, valid] of [
      [name, !!name.value],
      [email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value)],
    ] as const) {
      document.getElementById(`${input.id}-error`)!.hidden = valid;
      input.setAttribute("aria-invalid", String(!valid));
      if (!valid) first ??= input;
    }
    if (first) {
      event.preventDefault();
      first.focus();
      return;
    }
    pending = true;
    label.textContent = form.dataset.opening!;
    try {
      const query = new URLSearchParams(location.search);
      const utm = new URLSearchParams([...query].filter(([key]) => key.startsWith("utm_")));
      navigator.sendBeacon(
        "/api/lead",
        new URLSearchParams({
          name: name.value,
          email: email.value,
          src: query.get("src") || "direct",
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          page: location.pathname,
          utm: utm.toString(),
          sent_at: new Date().toISOString(),
        }),
      );
    } catch {
      /* A failed beacon must never prevent the application from opening. */
    }
  });
  addEventListener("pageshow", () => {
    pending = false;
    label.textContent = original;
  });
}
