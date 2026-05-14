import { z } from "zod";
import { IdSchema, PageSchema, PerPageSchema, ResponseFormatSchema } from "./common.js";

export const ProjectFieldsSchema = z.object({
  title: z.string().min(1).max(250).optional(),
  description: z.string().optional(),
  identifier: z.string().max(10).optional(),
  hex_color: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/)
    .optional(),
  parent_project_id: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Parent project ID; 0 for top-level"),
  is_favorite: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  position: z.number().optional(),
});

export type ProjectFields = z.infer<typeof ProjectFieldsSchema>;

export const ListProjectsInputSchema = z
  .object({
    page: PageSchema,
    perPage: PerPageSchema,
    search: z.string().max(200).optional(),
    is_archived: z.boolean().optional().describe("If set, filter by archived state"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetProjectInputSchema = z
  .object({
    id: IdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const CreateProjectInputSchema = z
  .object({
    title: z.string().min(1).max(250),
    description: z.string().optional(),
    parent_project_id: z.number().int().min(0).optional().describe("0 for top-level"),
    hex_color: z
      .string()
      .regex(/^#?[0-9a-fA-F]{6}$/)
      .optional(),
    is_favorite: z.boolean().optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const UpdateProjectInputSchema = z
  .object({
    id: IdSchema,
    fields: ProjectFieldsSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const ArchiveProjectInputSchema = z
  .object({
    id: IdSchema,
    archived: z.boolean().default(true).describe("Set false to unarchive"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const DeleteProjectInputSchema = z
  .object({
    id: IdSchema,
  })
  .strict();

export const DuplicateProjectInputSchema = z
  .object({
    id: IdSchema.describe("Source project ID"),
    parent_project_id: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Parent project for the duplicate; 0 for top-level"),
    response_format: ResponseFormatSchema,
  })
  .strict();
