// The application's one doorway. A page calls startApplication(); which form answers is decided by
// APPLICATION_MODE in src/config.ts. Nothing else on the site knows how the form is built.
import { clearApplication, initApply, pendingApplication, type ApplyData } from "./apply";
import { APPLICATION_MODE, APPLICATION_URL, BOOKED_PATH, BOOKING_URL } from "../config";

export type Kind = "application" | "prep";
type Who = { name: string; email: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const query = new URLSearchParams(location.search);
const src = query.get("src") || "direct";
const utm = new URLSearchParams([...query].filter(([key]) => key.startsWith("utm_"))).toString();
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

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
 * after the answers are saved. A finished booking sends the person to BOOKED_PATH: Cal.com's own
 * redirect is a paid feature, so the embed's booking event is what tells the page.
 */
function calendar(into: HTMLElement, who: Who, failed: () => void) {
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
          JSON.stringify({ name: who.name.split(/\s+/)[0] || "", email: who.email }),
        );
      } catch {
        /* Storage may be off: the page after the booking then greets without a name. */
      }
      // A moment on the calendar's own "confirmed" screen, then our page.
      window.setTimeout(() => location.assign(BOOKED_PATH), 900);
    },
  });
}

/** Answers typed before a booking that had not saved: one more try from the page after the booking. */
export async function resendPending(): Promise<"none" | "saved" | "failed"> {
  const pending = pendingApplication();
  if (!pending) return "none";
  try {
    await saveApplication(
      {
        ...pending,
        tz: zone(),
        page: location.pathname,
        sent_at: new Date().toISOString(),
        trap: "",
      },
      "application",
      AbortSignal.timeout(20000),
    );
    clearApplication();
    return "saved";
  } catch {
    return "failed";
  }
}

export function startApplication(options: { kind?: Kind; seed?: Who; done?: () => void } = {}) {
  const kind = options.kind ?? "application";
  if (APPLICATION_MODE === "native") {
    initApply({
      save: (data, signal) => saveApplication(data, kind, signal),
      booking:
        kind === "prep"
          ? undefined
          : ({ name, email }) => `${BOOKING_URL}?${new URLSearchParams({ name, email })}`,
      calendar: kind === "prep" ? undefined : calendar,
      opened: kind === "prep" ? undefined : opened,
      seed: options.seed,
      done: options.done,
    });
    return;
  }
  // "embed": the two fields hand the name and email to the hosted form, which leads on to the booking page.
  const forms = [...document.querySelectorAll<HTMLFormElement>("[data-apply-entry]")];
  for (const form of forms) {
    const name = form.elements.namedItem("name") as HTMLInputElement;
    const email = form.elements.namedItem("email") as HTMLInputElement;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const who = { name: name.value.trim(), email: email.value.trim() };
      const bad = !who.name ? name : !EMAIL.test(who.email) ? email : null;
      if (bad) {
        bad.setAttribute("aria-invalid", "true");
        bad.focus();
        return;
      }
      opened(who);
      location.assign(`${APPLICATION_URL}?${new URLSearchParams(who)}`);
    });
  }
  for (const opener of document.querySelectorAll<HTMLElement>("[data-apply-open]")) {
    opener.addEventListener("click", (event) => {
      event.preventDefault();
      const first = forms.find((form) => form.getBoundingClientRect().bottom > 0) ?? forms[0];
      first?.scrollIntoView({ block: "center" });
      (first?.elements.namedItem("name") as HTMLInputElement | null)?.focus({
        preventScroll: true,
      });
    });
  }
}
