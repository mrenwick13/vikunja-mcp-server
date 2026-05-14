import { z } from "zod";
import { IdSchema, PageSchema, PerPageSchema, ResponseFormatSchema } from "./common.js";

export const ListNotificationsInputSchema = z
  .object({
    page: PageSchema,
    perPage: PerPageSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const MarkNotificationInputSchema = z
  .object({
    id: IdSchema,
    read: z
      .boolean()
      .default(true)
      .describe("True to mark read (default), false to mark unread"),
    response_format: ResponseFormatSchema,
  })
  .strict();
