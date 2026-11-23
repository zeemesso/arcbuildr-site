// The application is a form on Tally ("Arcbuildr application"). The site opens it in Tally's popup with
// the name and email filled, and takes over when it is submitted: the answers go to POST /api/apply,
// then the calendar opens inside the page (src/scripts/application.ts).
export const TALLY_FORM = "M1aKGp";
// The same form as a full page: where people go when the popup cannot load. Name and email are added to it.
export const APPLICATION_URL = `https://tally.so/r/${TALLY_FORM}`;
// Where the calendar's link leads when the calendar cannot load inside the page. Name and email are added to it.
export const BOOKING_URL = "https://cal.com/arcbuildr/15-minute-call";
// The address shown on /privacy and in the footer.
export const CONTACT_EMAIL = "hello@arcbuildr.co";
// The sales video on the first screen, 16:9. Put the file in public/video/ and set its path here,
// for example "/video/vsl.mp4". While this is empty the frame shows a poster with a play mark and no
// words. On a preview, `?vsl=demo` shows the frame with a test film.
export const VSL_VIDEO = "";
// The 75-second video on /booked: put the file at public/video/confirmation.mp4.
// Until that file exists the page has no video block (src/pages/booked.astro checks).
export const CONFIRMATION_VIDEO = "/video/confirmation.mp4";
// Only for visitors who book the call from a chat, before they answer the 8 questions.
// /booked shows its button only when the address says the booking came from a chat:
// `via=chat`, or `eventTypeSlug` equal to CHAT_EVENT_SLUG.
// Its button opens the Tally form in the popup, on /booked, and the page stays there.
// If the popup cannot load it opens this address: the same questions with no booking page at their end.
export const APPLICATION_AFTER_BOOKING_URL = "https://tally.so/r/9NZpVV";
// The Cal.com event that is booked from a chat.
export const CHAT_EVENT_SLUG = "15-minute-call-chat";
// His face on the sales video's poster: a real photo of Zyade, as a path under public/ (for example "/proof/zyade.jpg").
// While this is empty the poster has no face. Never the pixel character, never a generated face.
export const FOUNDER_PHOTO = "";
// After a booking made in the calendar inside the page, the visitor goes here.
export const BOOKED_PATH = "/booked";
