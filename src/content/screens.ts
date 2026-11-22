/**
 * The few words inside a drawn screen. They are the deck's own (its `card NN, label N` slots); a screen
 * the deck gives no label to is shapes alone. Nothing is written here.
 */
import { section } from "./deck";

/** The labels of one card's screen, in the deck's order: `card 01, label 1`, and so on. */
export const labels = (card: string): (string | undefined)[] =>
  section(5)
    .list(`card ${card}, label `)
    .map(({ words }) => words);

/** The short tags of a card's screen (`card 04, tags`: "Reach. Like. Believe. Buy."), one per sentence. */
export const tags = (card: string): string[] =>
  (section(5).find(`card ${card}, tags`) ?? "")
    .split(".")
    .map((tag) => tag.trim())
    .filter(Boolean);
