import { z } from "zod";
import { IdSchema, ResponseFormatSchema } from "./common.js";

const IsoDateSchema = z
  .string()
  .regex(
    /^$|^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?)?$/,
    "Use ISO 8601 date or date-time, or empty string to clear",
  )
  .describe(
    "ISO 8601 date or date-time. Date-only and zone-less forms are normalised to RFC3339 (UTC) server-side. Empty string clears the date.",
  );

export const ProposeTaskInputSchema = z
  .object({
    project_id: IdSchema.describe("Project to create the task in"),
    title: z.string().min(1).max(250).describe("Task title"),
    description: z
      .string()
      .optional()
      .describe(
        "Task description. Markdown is accepted and auto-converted to HTML before being sent to Vikunja. Raw HTML is also accepted (pass-through).",
      ),
    due_date: IsoDateSchema.optional(),
    priority: z
      .number()
      .int()
      .min(0)
      .max(5)
      .optional()
      .describe("Priority 0-5"),
    extra_labels: z
      .array(z.string())
      .optional()
      .describe(
        "Additional label titles to apply on top of claude-suggested. Each must already exist as a label.",
      ),
    suggested_label: z
      .string()
      .default("claude-suggested")
      .describe(
        "Title of the label that marks Claude-proposed tasks. Defaults to 'claude-suggested'. Must already exist as a label.",
      ),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const SetStatusInputSchema = z
  .object({
    task_id: IdSchema.describe("Task to move"),
    project_id: IdSchema.describe("Project the task belongs to"),
    status: z
      .string()
      .min(1)
      .max(60)
      .describe(
        "Target Kanban column title (case-insensitive). For the agreed workflow, one of: Open, To Do, Doing, In Review, Done.",
      ),
    view_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Optional Kanban view ID. If omitted, the tool picks the project's first Kanban view.",
      ),
    keep_done: z
      .boolean()
      .default(false)
      .describe(
        "If true and the task was done before the move, restore done=true after. Useful for column-only changes that should not affect the done flag.",
      ),
    response_format: ResponseFormatSchema,
  })
  .strict();
