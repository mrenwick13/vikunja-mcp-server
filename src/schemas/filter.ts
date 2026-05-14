import { z } from "zod";
import { IdSchema, ResponseFormatSchema } from "./common.js";

const FilterPayloadSchema = z
  .object({
    s: z.string().optional().describe("Search string"),
    filter: z.string().optional().describe("Filter DSL, e.g. 'priority >= 3'"),
    filter_include_nulls: z.boolean().optional(),
    sort_by: z.array(z.string()).optional(),
    order_by: z.array(z.string()).optional(),
  })
  .partial();

export const FilterFieldsSchema = z.object({
  title: z.string().min(1).max(250).optional(),
  description: z.string().optional(),
  filters: FilterPayloadSchema.optional(),
  is_favorite: z.boolean().optional(),
});

export type FilterFields = z.infer<typeof FilterFieldsSchema>;

export const GetFilterInputSchema = z
  .object({
    id: IdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const CreateFilterInputSchema = z
  .object({
    title: z.string().min(1).max(250),
    description: z.string().optional(),
    filters: FilterPayloadSchema,
    is_favorite: z.boolean().optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const UpdateFilterInputSchema = z
  .object({
    id: IdSchema,
    fields: FilterFieldsSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const DeleteFilterInputSchema = z
  .object({
    id: IdSchema,
  })
  .strict();
