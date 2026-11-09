/** Cal.com event link, "<username>/<event-slug>". Created 2026-11-05: cal.com/arcbuildr/intro-call. */
export const CAL_LINK = "arcbuildr/intro-call";

/**
 * "Call now" contact, international digits only, no + or spaces (e.g. "212612345678").
 * Empty hides the button. WhatsApp is the WhatsApp Business line. No phone button (Zyade, 2026-11-09).
 */
export const WHATSAPP_NUMBER = "15012998574";
export const PHONE_NUMBER = "";

export const whatsappHref = (text: string) =>
  WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}` : "";
export const phoneHref = PHONE_NUMBER ? `tel:+${PHONE_NUMBER}` : "";
