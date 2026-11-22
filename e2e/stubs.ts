import { expect, type Page, type Request } from "@playwright/test";
import { press } from "./press";
import { application as form } from "../src/content/site";
import { BOOKING_URL, TALLY_FORM } from "../src/config";

/**
 * A stand-in for Cal.com's embed script: it puts an empty frame where the calendar goes, says it is
 * ready, and lets a test say "a booking was made". No test opens a real calendar or makes a booking.
 */
const EMBED = `(() => {
  const cal = window.Cal;
  const on = {};
  const run = (args) => {
    const [method, arg] = args;
    if (method === "on") on[arg.action] = arg.callback;
    if (method === "inline") {
      const frame = document.createElement("iframe");
      frame.title = "Calendar stand-in";
      frame.dataset.link = arg.calLink;
      frame.dataset.name = arg.config.name;
      frame.dataset.email = arg.config.email;
      arg.elementOrSelector.append(frame);
      setTimeout(() => on.linkReady && on.linkReady({ detail: {} }));
    }
  };
  const waiting = cal.q || [];
  cal.q = { push: run };
  waiting.forEach(run);
  window.__booked = () => on.bookingSuccessfulV2 && on.bookingSuccessfulV2({ detail: { data: {} } });
})();`;

/**
 * A stand-in for Tally's widget script. Like the real one it puts the form in a frame served from
 * Tally's own address, over the page, and tells the page what the frame says (the names and shapes are
 * the ones the real widget used on 23 Nov 2026). No test opens the real form or sends an answer to it.
 */
const WIDGET = `(() => {
  const forms = {};
  const wrap = (id) => document.querySelector('[data-tally-popup="' + id + '"]');
  window.__tally = { opened: [] };
  window.Tally = {
    openPopup(id, options = {}) {
      if (wrap(id)) return;
      forms[id] = options;
      window.__tally.opened.push({ id, layout: options.layout, hiddenFields: options.hiddenFields });
      const box = document.createElement("div");
      box.dataset.tallyPopup = id;
      box.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(0,0,0,.5)";
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "Close the form";
      close.dataset.tallyClose = "";
      close.onclick = () => window.Tally.closePopup(id);
      const frame = document.createElement("iframe");
      frame.title = "Form stand-in";
      frame.style.cssText = "width:min(90vw,30rem);height:12rem;border:0;background:white";
      frame.src = "https://tally.so/popup/" + id + "?" + new URLSearchParams(options.hiddenFields || {});
      box.append(frame, close);
      document.body.append(box);
    },
    closePopup(id) {
      const box = wrap(id);
      if (!box) return;
      box.remove();
      forms[id] && forms[id].onClose && forms[id].onClose();
    },
  };
  addEventListener("message", (event) => {
    if (event.origin !== "https://tally.so" || typeof event.data !== "string") return;
    let said;
    try { said = JSON.parse(event.data); } catch { return; }
    const options = forms[said.payload && said.payload.formId];
    if (said.event === "Tally.FormSubmitted" && options && options.onSubmit) options.onSubmit(said.payload);
    if (said.event === "Tally.PopupClosed") window.Tally.closePopup(said.payload.formId);
  }, true);
})();`;

/**
 * The frame's page. A test hands it what to send, then presses its button: the press is what lets a
 * frame from another site move the whole page, as Tally's "redirect on completion" does.
 */
const POPUP = `<!doctype html><meta charset="utf-8"><title>Form stand-in</title>
<button id="send" disabled>Submit</button>
<script>
  const id = location.pathname.split("/").pop();
  const say = (event, payload) => parent.postMessage(JSON.stringify({ event, payload }), "*");
  let job = null;
  addEventListener("message", (event) => {
    if (!event.data || !event.data.standIn) return;
    job = event.data;
    document.getElementById("send").disabled = false;
  });
  document.getElementById("send").onclick = () => {
    say("Tally.FormSubmitted", job.payload);
    if (job.redirect) {
      say("Tally.FormRedirect", { formId: id, url: job.redirect });
      // The real form moves the whole page itself, in the same breath (seen on 23 Nov 2026).
      top.location.href = job.redirect;
    }
  };
  say("Tally.FormLoaded", { formId: id });
  say("Tally.FormPageView", { formId: id, page: 1 });
</script>`;

type Save = "ok" | "fail" | "hang" | "plain only";
/**
 * "ok": the popup works. "silent": the popup opens and its form never shows. "page": the widget cannot
 * load, and Tally's own site answers. "blocked": nothing of Tally can be reached.
 */
type Tally = "ok" | "silent" | "page" | "blocked";

/** The site's two endpoints, the form, the calendar and the booking page are stand-ins: no test writes a row. */
export async function stub(page: Page, save: Save = "ok", tally: Tally = "ok") {
  const state = {
    save,
    tally,
    applies: [] as Request[],
    leads: [] as Request[],
    calendars: [] as Request[],
    forms: [] as Request[],
  };
  // The visit counter is another company's script: a slow answer from it must not hold a test up.
  await page.route(/cloudflareinsights\.com/, (route) => route.abort());
  await page.route("**/api/lead", (route) => {
    state.leads.push(route.request());
    return route.fulfill({ status: 204 });
  });
  await page.route("**/api/apply", (route) => {
    const request = route.request();
    state.applies.push(request);
    // A form the browser posted itself is sent on to the booking page with the name and email filled,
    // as the Worker does it (tests/apply.test.ts). The Worker answers 303; a stand-in cannot answer with a
    // redirect in the iPhone engine, so this one is a page that moves on at once.
    if ((request.headers()["content-type"] ?? "").startsWith("application/x-www-form-urlencoded")) {
      const fields = new URLSearchParams(request.postData() ?? "");
      const who = { name: fields.get("name") ?? "", email: fields.get("email") ?? "" };
      const next = `${BOOKING_URL}?${new URLSearchParams(who)}`.replace(/&/g, "&amp;");
      return route.fulfill({
        contentType: "text/html",
        body: `<meta http-equiv="refresh" content="0;url=${next}"><title>Saved</title>`,
      });
    }
    // "hang": the answer never comes, as on a connection that has stalled.
    if (state.save === "hang") return;
    // "plain only": the sheet refuses the whole application and takes the plain row.
    const taken =
      state.save === "ok" || (state.save === "plain only" && request.postDataJSON().plain === true);
    return taken
      ? route.fulfill({ json: { ok: true } })
      : route.fulfill({ status: 502, json: { ok: false } });
  });
  await page.route("https://tally.so/**", (route) => {
    const request = route.request();
    state.forms.push(request);
    const { pathname } = new URL(request.url());
    if (state.tally === "blocked") return route.abort();
    if (pathname.startsWith("/widgets/"))
      return state.tally === "page"
        ? route.abort()
        : route.fulfill({ contentType: "text/javascript", body: WIDGET });
    if (pathname.startsWith("/popup/"))
      return route.fulfill({
        contentType: "text/html",
        body: state.tally === "silent" ? "<title>Nothing</title>" : POPUP,
      });
    return route.fulfill({
      contentType: "text/html",
      body: "<title>Form page stand-in</title><h1>Form</h1>",
    });
  });
  await page.route("https://app.cal.com/**", (route) => {
    state.calendars.push(route.request());
    return route.fulfill({ contentType: "text/javascript", body: EMBED });
  });
  await page.route("https://cal.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Booking stand-in</title><h1>Booking</h1>",
    }),
  );
  return state;
}

export const layer = (page: Page) => page.locator("[data-apply]");
export const calendar = (page: Page) => page.locator("[data-apply-calendar]");
export const ending = (page: Page) => page.locator("[data-apply-end]");
export const plain = (page: Page) => page.locator("[data-apply-plain]");
/** Tally's popup, over the page. */
export const popup = (page: Page) => page.locator("[data-tally-popup]");
/** What the page asked Tally's widget to open, in order. */
export const opened = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          __tally?: {
            opened: { id: string; layout: string; hiddenFields: Record<string, string> }[];
          };
        }
      ).__tally?.opened ?? [],
  );

type Who = { name: string; email: string };
const choices = (id: string) => {
  const question = form.questions.find((item) => item.id === id)!;
  return question.type === "choice" ? question.options : [];
};
/** A full set of answers, with the second budget: the calendar follows. */
export const answers: Record<string, string> = {
  profile: "@test.visitor",
  sell: "TEST: bookkeeping. One client is worth 2,000 USD.",
  stranger: "TEST: that I do the books.",
  film: choices("film")[2]!,
  count: choices("count")[0]!,
  decides: choices("decides")[1]!,
  start: choices("start")[3]!,
  budget: choices("budget")[1]!,
};
/** The lowest budget: the form ends with no calendar. */
export const lowest = choices("budget")[0]!;

/**
 * What Tally hands the page when the form is sent, in the shape its widget used on 23 Nov 2026: a
 * choice arrives as its words, with the choice's ids beside them.
 * `typed`: the name and email were asked by the form, not handed over by the page.
 */
export function submission(
  who: Who,
  given: Record<string, string> = answers,
  {
    typed = false,
    titles = (q: string) => q,
    extra = {} as Record<string, string>,
    formId = TALLY_FORM as string,
  } = {},
) {
  const field = (title: string, type: string, value: string, raw: unknown = value) => ({
    id: `f-${title.length}-${type}`,
    title,
    type,
    answer: { value, raw },
  });
  const people = typed
    ? [field(form.who[0].q, "INPUT_TEXT", who.name), field(form.who[1].q, "INPUT_EMAIL", who.email)]
    : [
        field("name", "HIDDEN_FIELDS", who.name),
        field("email", "HIDDEN_FIELDS", who.email),
        ...Object.entries(extra).map(([key, value]) => field(key, "HIDDEN_FIELDS", value)),
      ];
  return {
    id: "stand-in",
    respondentId: "stand-in",
    formId,
    formName: "Arcbuildr application",
    createdAt: new Date().toISOString(),
    fields: [
      ...people,
      ...form.questions.map((question) =>
        question.type === "choice"
          ? field(titles(question.q), "MULTIPLE_CHOICE", given[question.id]!, ["choice-id"])
          : field(
              titles(question.q),
              question.type === "long" ? "TEXTAREA" : "INPUT_TEXT",
              given[question.id]!,
            ),
      ),
    ],
  };
}

/** Sends the form that is open in the popup. `redirect`: the form is set to move the page afterwards. */
export async function send(page: Page, payload: unknown, redirect = "") {
  const frame = popup(page).locator("iframe");
  const button = page.frameLocator("[data-tally-popup] iframe").locator("#send");
  await expect(button).toBeVisible();
  await frame.evaluate(
    (el, job) => (el as HTMLIFrameElement).contentWindow!.postMessage(job, "*"),
    { standIn: true, payload, redirect },
  );
  await expect(button).toBeEnabled();
  // The installed Chrome sometimes gives a test's first press to the frame's box, not to the page inside
  // it. So the press is repeated until the form has gone, or the page has left.
  const { origin } = new URL(page.url());
  for (let tries = 0; tries < 5; tries++) {
    if (new URL(page.url()).origin !== origin) return;
    if (
      (await popup(page)
        .count()
        .catch(() => 0)) === 0
    )
      return;
    await press(button, { timeout: 2000 }).catch(() => {});
    await popup(page)
      .waitFor({ state: "detached", timeout: 1500 })
      .catch(() => {});
  }
}

/** Fills the two fields of the last panel and opens the form with them. */
export async function open(page: Page, who: Who, path = "/") {
  await page.goto(path);
  await page.locator("#apply input[name=name]").fill(who.name);
  await page.locator("#apply input[name=email]").fill(who.email);
  await press(page.locator("#apply form button"));
  await expect(popup(page)).toBeVisible();
}

/** Opens the form with the two fields, and sends it with these answers. */
export async function apply(page: Page, who: Who, given: Record<string, string> = answers) {
  await open(page, who);
  await send(page, submission(who, given));
}
