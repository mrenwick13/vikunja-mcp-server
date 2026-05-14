import { CHARACTER_LIMIT } from "../constants.js";
import { ResponseFormat } from "../schemas/common.js";

export interface PaginatedResponse<T> {
  total: number;
  count: number;
  page: number;
  perPage: number;
  items: T[];
  has_more: boolean;
  next_page?: number;
}

export function buildPaginated<T>(
  items: T[],
  page: number,
  perPage: number,
  total: number | undefined,
): PaginatedResponse<T> {
  const knownTotal = total ?? items.length + (page - 1) * perPage + (items.length === perPage ? 1 : 0);
  const has_more = items.length === perPage;
  return {
    total: knownTotal,
    count: items.length,
    page,
    perPage,
    items,
    has_more,
    ...(has_more ? { next_page: page + 1 } : {}),
  };
}

export type StructuredPayload = Record<string, unknown>;

export interface ToolTextResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: StructuredPayload;
  isError?: boolean;
  [k: string]: unknown;
}

export function renderJsonResponse(structured: StructuredPayload): ToolTextResult {
  const text = JSON.stringify(structured, null, 2);
  return enforceLimit({
    content: [{ type: "text", text }],
    structuredContent: structured,
  });
}

export function renderMarkdownResponse(
  markdown: string,
  structured?: StructuredPayload,
): ToolTextResult {
  return enforceLimit({
    content: [{ type: "text", text: markdown }],
    ...(structured !== undefined ? { structuredContent: structured } : {}),
  });
}

export function renderResponse(
  format: ResponseFormat,
  markdown: string,
  structured: StructuredPayload,
): ToolTextResult {
  return format === ResponseFormat.JSON
    ? renderJsonResponse(structured)
    : renderMarkdownResponse(markdown, structured);
}

export function renderError(message: string): ToolTextResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

function enforceLimit(result: ToolTextResult): ToolTextResult {
  const text = result.content[0]?.text ?? "";
  if (text.length <= CHARACTER_LIMIT) return result;
  const truncated = `${text.slice(0, CHARACTER_LIMIT)}\n\n...[truncated at ${CHARACTER_LIMIT} characters. Reduce perPage or use response_format='json' with a narrower query.]`;
  return {
    ...result,
    content: [{ type: "text", text: truncated }],
  };
}

export function formatHexColor(value: string | undefined | null): string {
  if (!value) return "";
  const trimmed = value.replace(/^#/, "").trim();
  return trimmed ? `#${trimmed}` : "";
}

export function isoOrBlank(value: string | undefined | null): string {
  if (!value) return "";
  if (value.startsWith("0001-01-01")) return "";
  return value;
}

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((acc, str, i) => {
    const v = i < values.length ? values[i] : "";
    return acc + str + (v ?? "");
  }, "");
}
