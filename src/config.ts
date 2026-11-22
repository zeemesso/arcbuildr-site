// The application is one swappable part (src/components/application/).
// "native": our own form on this site, one question per screen. Its answers go to POST /api/apply.
// "embed": a form hosted elsewhere. The two fields send the name and email to APPLICATION_URL, and that
// form sends people on to the booking page itself. To swap: set this to "embed" and set APPLICATION_URL.
export const APPLICATION_MODE: "native" | "embed" = "native";
// Used in "embed" mode only. This is the form the site used until 21 Nov 2026.
export const APPLICATION_URL = "https://tally.so/r/M1aKGp";
// Where the native form sends people once their answers are saved. Name and email are added to it.
export const BOOKING_URL = "https://cal.com/arcbuildr/15-minute-call";
// Changed by hand the day a client pays; 0 to 3.
export const FOUNDING_PLACES_LEFT = 3;
// The address shown on /privacy and in the footer.
export const CONTACT_EMAIL = "hello@arcbuildr.co";
// The sales video that leads the home page, 16:9. Put the file in public/video/ and set its path here,
// for example "/video/vsl.mp4". While this is empty the video block is not on the page at all: the
// first screen is complete without it. On a preview, `?vsl=demo` shows the block with a test film.
export const VSL_VIDEO = "";
// The 75-second video on /booked: put the file at public/video/confirmation.mp4.
// Until that file exists the page has no video block (src/pages/booked.astro checks).
export const CONFIRMATION_VIDEO = "/video/confirmation.mp4";
// Only for visitors who book the call from a chat, before they answer the 8 questions.
// /booked shows its button only when the address says the booking came from a chat:
// `via=chat`, or `eventTypeSlug` equal to CHAT_EVENT_SLUG.
// In "native" mode the button opens our own form on /booked, which saves and stays there.
// In "embed" mode it opens this address: the same application with no redirect to the booking page at its end.
export const APPLICATION_AFTER_BOOKING_URL = "https://tally.so/r/9NZpVV";
// The Cal.com event that is booked from a chat.
export const CHAT_EVENT_SLUG = "15-minute-call-chat";
// His face on the sales video's poster: a real photo of Zyade, as a path under public/ (for example "/proof/zyade.jpg").
// While this is empty the poster has no face. Never the pixel character, never a generated face.
export const FOUNDER_PHOTO = "";
// After a booking made in the calendar inside the page, the visitor goes here.
export const BOOKED_PATH = "/booked";
