export const APPLICATION_URL = "https://tally.so/r/M1aKGp";
// Changed by hand the day a client pays; 0 to 3.
export const FOUNDING_PLACES_LEFT = 3;
// The address shown on /privacy and in the footer.
export const CONTACT_EMAIL = "hello@arcbuildr.co";
// The founder video near the top of the home page, 60 to 90 seconds.
// Put the file in public/video/ and set its path here, for example "/video/season-one.mp4".
// While this is empty the card shows its poster and no play button.
export const FOUNDER_VIDEO = "";
// The 75-second video on /booked. Same rule.
export const CONFIRMATION_VIDEO = "";
// Only for visitors who book the call from a chat, before they answer the 8 questions:
// the address of the same application with no redirect to the booking page at its end.
// /booked shows its button only when the address says the booking came from a chat:
// `via=chat`, or `eventTypeSlug` equal to CHAT_EVENT_SLUG. While this is empty, there is no button.
export const APPLICATION_AFTER_BOOKING_URL = "https://tally.so/r/9NZpVV";
// The Cal.com event that is booked from a chat.
export const CHAT_EVENT_SLUG = "15-minute-call-chat";
