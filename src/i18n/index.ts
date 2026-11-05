import { en, type Dict } from "./en";
import { fr } from "./fr";

export type Lang = "en" | "fr";
export const LANGS: Lang[] = ["en", "fr"];
export const LANG_NAMES: Record<Lang, string> = { en: "English", fr: "Français" };

export const dict = (lang: Lang): Dict => (lang === "fr" ? fr : en);

/** English lives at the root, French under /fr. `href("fr", "/privacy")` gives "/fr/privacy". */
export function href(lang: Lang, path: string): string {
  return lang === "en" ? path : `/fr${path}`;
}

export const langFromPath = (pathname: string): Lang =>
  pathname === "/fr" || pathname.startsWith("/fr/") ? "fr" : "en";

/** The same page in English: "/fr/privacy/" gives "/privacy/", "/fr/" gives "/". */
export const stripLang = (pathname: string): string =>
  langFromPath(pathname) === "fr" ? pathname.slice(3) || "/" : pathname;
