import { z } from "zod";
import { IdSchema, ResponseFormatSchema } from "./common.js";

export const ListBucketsInputSchema = z
  .object({
    project_id: IdSchema,
    view_id: IdSchema.describe("Kanban view ID"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const CreateBucketInputSchema = z
  .object({
    project_id: IdSchema,
    view_id: IdSchema,
    title: z.string().min(1).max(250),
    limit: z.number().int().min(0).optional().describe("WIP limit; 0 = unlimited"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const UpdateBucketInputSchema = z
  .object({
    project_id: IdSchema,
    view_id: IdSchema,
    bucket_id: IdSchema,
    title: z.string().min(1).max(250).optional(),
    limit: z.number().int().min(0).optional(),
    position: z.number().optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const DeleteBucketInputSchema = z
  .object({
    project_id: IdSchema,
    view_id: IdSchema,
    bucket_id: IdSchema,
  })
  .strict();
