/** Cal.com event link, "<username>/<event-slug>". Created 2026-11-05: cal.com/arcbuildr/intro-call. */
export const CAL_LINK = "arcbuildr/intro-call";

/**
 * "Call now" contact, international digits only, no + or spaces (e.g. "212612345678").
 * PLACEHOLDER: Zyade to fill. While empty, the WhatsApp and phone buttons stay hidden.
 */
export const WHATSAPP_NUMBER = "";
export const PHONE_NUMBER = "";

export const whatsappHref = (text: string) =>
  WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}` : "";
export const phoneHref = PHONE_NUMBER ? `tel:+${PHONE_NUMBER}` : "";
