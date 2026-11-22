// The page after a booking. The booking page can send the first name and the email along.
// A name is letters only and an email is a plain address, so nothing else can be shown here or passed on.
import { BOOKED_KEY, resendPending, startApplication } from "./application";
import { CHAT_EVENT_SLUG } from "../config";

const query = new URLSearchParams(location.search);
// The calendar inside our form leaves the name and email on this device; a booking page can send them in the address.
const kept = (() => {
  try {
    const found = JSON.parse(sessionStorage.getItem(BOOKED_KEY) || "{}") as Record<string, unknown>;
    return { name: String(found.name ?? ""), email: String(found.email ?? "") };
  } catch {
    return { name: "", email: "" };
  }
})();
const given = (
  query.get("attendeeFirstName") ||
  query.get("attendeeName") ||
  query.get("name") ||
  kept.name
)
  .trim()
  .split(/\s+/)[0]!;
const name = /^[\p{L}'’-]{1,40}$/u.test(given) ? given : "";
const typed = (query.get("email") || kept.email).trim();
const email =
  typed.length <= 254 && /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(typed)
    ? typed
    : "";

const heading = document.querySelector<HTMLElement>("[data-booked]");
if (heading && name) heading.textContent = heading.dataset.booked!.replace("{name}", name);

// Booked from a chat: the 8 questions are not answered yet, so they come first.
const chat = document.querySelector<HTMLElement>("[data-chat]");
const fromChat = query.get("via") === "chat" || query.get("eventTypeSlug") === CHAT_EVENT_SLUG;
if (chat && fromChat) {
  const action = chat.querySelector<HTMLElement>("[data-chat-action]")!;
  document.querySelector<HTMLElement>("[data-note]")!.hidden = true;
  chat.hidden = false;
  // The questions open on this page, with the name and email filled, and the page stays here.
  // If they cannot start, the rest of this page still runs.
  try {
    startApplication({
      kind: "prep",
      seed: { name, email },
      done: () => {
        action.hidden = true;
        chat.querySelector<HTMLElement>("[data-chat-first]")!.hidden = true;
        chat.querySelector<HTMLElement>("[data-chat-saved]")!.hidden = false;
      },
    });
  } catch {
    /* As above. */
  }
}

// Booked although the answers had not saved: try once more, and say how it went.
const resend = document.querySelector<HTMLElement>("[data-resend]");
if (resend && !fromChat) {
  const note = resend.querySelector<HTMLElement>("[data-resend-note]")!;
  const retry = resend.querySelector<HTMLButtonElement>("[data-resend-retry]")!;
  const attempt = async () => {
    retry.disabled = true;
    const result = await resendPending();
    retry.disabled = false;
    if (result === "none") return;
    resend.hidden = false;
    note.textContent = result === "saved" ? note.dataset.saved! : note.dataset.failed!;
    retry.hidden = result === "saved";
  };
  retry.addEventListener("click", () => void attempt());
  void attempt();
}
