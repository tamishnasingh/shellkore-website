import { Marked, type Tokens } from "marked";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const safeHref = (href: string) => /^(https?:\/\/|mailto:|\/|#)/i.test(href.trim()) ? href.trim() : "#";

/** Markdown renderer for CMS and blog content. Raw HTML is escaped and links are restricted to safe schemes. */
const md = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html(token: Tokens.HTML | Tokens.Tag) {
      return esc(token.text);
    },
    link(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Link) {
      const href = safeHref(token.href);
      const ext = /^https?:\/\//i.test(href);
      const text = this.parser.parseInline(token.tokens as Tokens.Generic[]);
      return `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>${text}</a>`;
    },
    image(token: Tokens.Image) {
      return esc(token.text || "");
    },
  },
});

export function renderMarkdown(src: string): string {
  return md.parse(src || "", { async: false }) as string;
}
