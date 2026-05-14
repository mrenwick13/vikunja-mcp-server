import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants.js";

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

export const ResponseFormatSchema = z
  .nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable, 'json' for machine-readable");

export const PageSchema = z
  .number()
  .int()
  .min(1)
  .default(1)
  .describe("Page number (1-indexed) for paginated results");

export const PerPageSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_PAGE_SIZE)
  .default(DEFAULT_PAGE_SIZE)
  .describe(`Results per page (1-${MAX_PAGE_SIZE}). Vikunja caps this at ${MAX_PAGE_SIZE}.`);

export const PaginationSchema = z.object({
  page: PageSchema,
  perPage: PerPageSchema,
});

export const SearchSchema = z
  .string()
  .max(200)
  .optional()
  .describe("Optional case-insensitive search string to filter results by title or description");

export const IdSchema = z
  .number()
  .int()
  .positive()
  .describe("Numeric ID of the resource");
