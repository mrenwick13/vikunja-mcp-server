import { z } from "zod";
import { IdSchema, PageSchema, PerPageSchema, ResponseFormatSchema } from "./common.js";

export const ListCommentsInputSchema = z
  .object({
    task_id: IdSchema,
    page: PageSchema,
    perPage: PerPageSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetCommentInputSchema = z
  .object({
    task_id: IdSchema,
    comment_id: IdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const CreateCommentInputSchema = z
  .object({
    task_id: IdSchema,
    comment: z.string().min(1).describe("Comment text (HTML or plain)"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const UpdateCommentInputSchema = z
  .object({
    task_id: IdSchema,
    comment_id: IdSchema,
    comment: z.string().min(1),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const DeleteCommentInputSchema = z
  .object({
    task_id: IdSchema,
    comment_id: IdSchema,
  })
  .strict();
