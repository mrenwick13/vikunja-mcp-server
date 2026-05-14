import { z } from "zod";
import { IdSchema, PageSchema, PerPageSchema, ResponseFormatSchema } from "./common.js";

export const LabelFieldsSchema = z.object({
  title: z.string().min(1).max(250).optional(),
  description: z.string().optional(),
  hex_color: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/)
    .optional(),
});

export type LabelFields = z.infer<typeof LabelFieldsSchema>;

export const ListLabelsInputSchema = z
  .object({
    page: PageSchema,
    perPage: PerPageSchema,
    search: z.string().max(200).optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetLabelInputSchema = z
  .object({
    id: IdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const CreateLabelInputSchema = z
  .object({
    title: z.string().min(1).max(250),
    description: z.string().optional(),
    hex_color: z
      .string()
      .regex(/^#?[0-9a-fA-F]{6}$/)
      .optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const UpdateLabelInputSchema = z
  .object({
    id: IdSchema,
    fields: LabelFieldsSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const DeleteLabelInputSchema = z
  .object({
    id: IdSchema,
  })
  .strict();

export const TaskLabelInputSchema = z
  .object({
    task_id: IdSchema,
    label_id: IdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const ListTaskLabelsInputSchema = z
  .object({
    task_id: IdSchema,
    page: PageSchema,
    perPage: PerPageSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const SetTaskLabelsInputSchema = z
  .object({
    task_id: IdSchema,
    label_ids: z.array(IdSchema).describe("Replace task's labels with this exact set"),
    response_format: ResponseFormatSchema,
  })
  .strict();
