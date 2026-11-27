// Turns a deliverable (Markdown written by the model) into HTML for the result page.
// The page inserts this HTML as is, so the rule here is absolute: every character of the
// input is escaped first, and the only tags in the output are the ones this file writes.
// Supported: "## " and "### " headings, paragraphs, "- " and "1. " lists, "> " quotes, "---",
// **bold** and *italic*. Anything else stays visible as plain text.

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ESCAPES[char]!);

/** Escapes, then turns **bold** and *italic* into tags. */
function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?![*\w])/g, "$1<em>$2</em>");
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^[-*•]\s+(.*)$/;
const NUMBER = /^\d{1,3}[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const RULE = /^(-{3,}|\*{3,}|_{3,})$/;

export function renderMarkdown(markdown: string): string {
  const out: string[] = [];
  let paragraph: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];

  const flush = () => {
    if (paragraph.length) out.push(`<p>${inline(paragraph.join(" "))}</p>`);
    if (list)
      out.push(
        `<${list.tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join("")}</${list.tag}>`,
      );
    if (quote.length) out.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
    paragraph = [];
    list = null;
    quote = [];
  };

  for (const raw of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (RULE.test(line)) {
      flush();
      out.push("<hr>");
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      // The page owns the h1, so sections start at h2. Deeper levels all become h3.
      const tag = heading[1]!.length <= 2 ? "h2" : "h3";
      out.push(`<${tag}>${inline(heading[2]!.replace(/\s+#+$/, ""))}</${tag}>`);
      continue;
    }
    const bullet = BULLET.exec(line);
    const number = bullet ? null : NUMBER.exec(line);
    if (bullet || number) {
      const tag = bullet ? "ul" : "ol";
      if (!list || list.tag !== tag) flush();
      list ??= { tag, items: [] };
      list.items.push((bullet ?? number)![1]!);
      continue;
    }
    const quoted = QUOTE.exec(line);
    if (quoted) {
      if (!quote.length) flush();
      quote.push(quoted[1]!);
      continue;
    }
    // A plain line continues the list item or quote above it, or else a paragraph.
    if (list) list.items[list.items.length - 1] += ` ${line}`;
    else if (quote.length) quote.push(line);
    else paragraph.push(line);
  }
  flush();
  return out.join("\n");
}
