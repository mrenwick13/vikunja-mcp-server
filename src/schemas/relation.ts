import { z } from "zod";
import { IdSchema, ResponseFormatSchema } from "./common.js";

export const RelationKindSchema = z
  .enum([
    "subtask",
    "parenttask",
    "related",
    "duplicateof",
    "duplicates",
    "blocking",
    "blocked",
    "precedes",
    "follows",
    "copiedfrom",
    "copiedto",
  ])
  .describe("Relation type between two tasks");

export const CreateRelationInputSchema = z
  .object({
    task_id: IdSchema,
    other_task_id: IdSchema,
    relation_kind: RelationKindSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const DeleteRelationInputSchema = z
  .object({
    task_id: IdSchema,
    other_task_id: IdSchema,
    relation_kind: RelationKindSchema,
  })
  .strict();
