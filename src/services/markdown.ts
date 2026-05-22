import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: false,
});

const HTML_LEADING_TAG_RE = /^\s*<(p|h[1-6]|ul|ol|li|div|blockquote|pre|table|hr|br)(\s|>|\/)/i;
const HTML_TAG_DENSITY_RE = /<\/?[a-z][^>]*>/gi;

function looksLikeHtml(input: string): boolean {
  if (HTML_LEADING_TAG_RE.test(input)) return true;
  const matches = input.match(HTML_TAG_DENSITY_RE);
  if (!matches) return false;
  return matches.length >= 3;
}

export function descriptionToHtml(input: string | undefined): string | undefined {
  if (input === undefined) return undefined;
  if (input === "") return "";
  if (looksLikeHtml(input)) return input;
  return md.render(input).trim();
}

export const __testing__ = { looksLikeHtml };
