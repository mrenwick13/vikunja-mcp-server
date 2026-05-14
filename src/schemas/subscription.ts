import { z } from "zod";
import { IdSchema, ResponseFormatSchema } from "./common.js";

const EntitySchema = z
  .enum(["project", "task"])
  .describe("Entity kind that the subscription is attached to");

export const SubscribeInputSchema = z
  .object({
    entity: EntitySchema,
    entity_id: IdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const UnsubscribeInputSchema = z
  .object({
    entity: EntitySchema,
    entity_id: IdSchema,
  })
  .strict();
