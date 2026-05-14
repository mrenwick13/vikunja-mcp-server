import { z } from "zod";
import { IdSchema, ResponseFormatSchema } from "./common.js";

const ViewKindSchema = z
  .enum(["list", "gantt", "table", "kanban"])
  .describe("View kind");

const BucketConfigurationModeSchema = z
  .enum(["none", "manual", "filter"])
  .describe("How buckets are populated");

export const ViewFieldsSchema = z.object({
  title: z.string().min(1).max(250).optional(),
  view_kind: ViewKindSchema.optional(),
  position: z.number().optional(),
  bucket_configuration_mode: BucketConfigurationModeSchema.optional(),
  default_bucket_id: z.number().int().min(0).optional(),
  done_bucket_id: z.number().int().min(0).optional(),
  filter: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Optional filter object applied to the view"),
});

export type ViewFields = z.infer<typeof ViewFieldsSchema>;

export const ListViewsInputSchema = z
  .object({
    project_id: IdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetViewInputSchema = z
  .object({
    project_id: IdSchema,
    id: IdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const CreateViewInputSchema = z
  .object({
    project_id: IdSchema,
    title: z.string().min(1).max(250),
    view_kind: ViewKindSchema,
    position: z.number().optional(),
    bucket_configuration_mode: BucketConfigurationModeSchema.optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const UpdateViewInputSchema = z
  .object({
    project_id: IdSchema,
    id: IdSchema,
    fields: ViewFieldsSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const DeleteViewInputSchema = z
  .object({
    project_id: IdSchema,
    id: IdSchema,
  })
  .strict();
