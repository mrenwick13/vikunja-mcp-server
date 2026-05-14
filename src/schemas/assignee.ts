import { z } from "zod";
import { IdSchema, PageSchema, PerPageSchema, ResponseFormatSchema } from "./common.js";

export const ListAssigneesInputSchema = z
  .object({
    task_id: IdSchema,
    page: PageSchema,
    perPage: PerPageSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const AddAssigneeInputSchema = z
  .object({
    task_id: IdSchema,
    user_id: IdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const RemoveAssigneeInputSchema = z
  .object({
    task_id: IdSchema,
    user_id: IdSchema,
  })
  .strict();
