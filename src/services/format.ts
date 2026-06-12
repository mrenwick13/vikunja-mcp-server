import { CHARACTER_LIMIT } from "../constants.js";
import { ResponseFormat } from "../schemas/common.js";
import type { PaginationInfo } from "./api.js";

export interface PaginatedResponse<T> {
  /** Exact total item count; only present when it can be known (last page, or empty result). */
  total?: number;
  /** Total pages reported by Vikunja's x-pagination-total-pages header, when available. */
  total_pages?: number;
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
  pagination?: PaginationInfo,
): PaginatedResponse<T> {
  const totalPages = pagination?.totalPages;
  // With the real total-pages header, has_more is exact. Without it, fall back to the
  // page-fullness heuristic (an exactly-full last page will look like more is available).
  const has_more = totalPages !== undefined ? page < totalPages : items.length === perPage;
  // Vikunja reports total pages, not total items, so the exact item total is only
  // knowable on the last page (or when there are no results). Never fabricate it.
  let total: number | undefined;
  if (totalPages !== undefined) {
    if (totalPages === 0) total = items.length;
    else if (page === totalPages) total = (page - 1) * perPage + items.length;
  }
  return {
    ...(total !== undefined ? { total } : {}),
    ...(totalPages !== undefined ? { total_pages: totalPages } : {}),
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

export function isoOrBlank(value: string | undefined | null): string {
  if (!value) return "";
  if (value.startsWith("0001-01-01")) return "";
  return value;
}

/** Vikunja's "zero time". Sending this for a date field explicitly clears it. */
export const VIKUNJA_ZERO_TIME = "0001-01-01T00:00:00Z";

/**
 * Normalise an incoming ISO 8601 date into full RFC3339, the only form Vikunja's
 * parser accepts. Date-only values become midnight UTC; timestamps missing seconds
 * and/or a zone get ':00' / 'Z' appended. The empty string is the documented
 * "clear this date" sentinel and maps to Vikunja's zero time.
 */
export function normaliseIsoDate(value: string): string {
  if (value === "") return VIKUNJA_ZERO_TIME;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00Z`;
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2})?(Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if (m) return `${m[1]}${m[2] ?? ":00"}${m[3] ?? "Z"}`;
  return value;
}
