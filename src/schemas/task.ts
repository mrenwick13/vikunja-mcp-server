import { z } from "zod";
import { IdSchema, PageSchema, PerPageSchema, ResponseFormatSchema } from "./common.js";

const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})?)?$/, "Use ISO 8601 date or date-time")
  .describe("ISO 8601 date or date-time (e.g. 2026-05-20 or 2026-05-20T17:00:00Z)");

export const TaskFieldsSchema = z.object({
  title: z.string().min(1).max(250).optional().describe("Task title"),
  description: z
    .string()
    .optional()
    .describe(
      "Task description. Markdown is accepted and auto-converted to HTML before being sent to Vikunja. Raw HTML is also accepted (pass-through). Use the standard Markdown subset: headings, lists, code, bold/italic, links, blockquotes.",
    ),
  done: z.boolean().optional().describe("Whether the task is complete"),
  due_date: IsoDateSchema.optional().describe("Due date; pass empty string to clear"),
  start_date: IsoDateSchema.optional(),
  end_date: IsoDateSchema.optional(),
  priority: z
    .number()
    .int()
    .min(0)
    .max(5)
    .optional()
    .describe("Priority 0-5 (0=none, 5=highest)"),
  percent_done: z.number().min(0).max(1).optional().describe("Progress 0.0 to 1.0"),
  hex_color: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/, "Hex colour like #ff8800")
    .optional(),
  is_favorite: z.boolean().optional(),
  bucket_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Kanban bucket ID. Use vikunja_move_task_to_bucket for the dedicated move endpoint; this field is honoured by the generic update too.",
    ),
  repeat_after: z.number().int().min(0).optional(),
  repeat_mode: z
    .number()
    .int()
    .min(0)
    .max(2)
    .optional()
    .describe("0=after completion, 1=monthly, 2=from current date"),
  cover_image_attachment_id: z.number().int().min(0).optional(),
});

export type TaskFields = z.infer<typeof TaskFieldsSchema>;

export const ListTasksInputSchema = z
  .object({
    page: PageSchema,
    perPage: PerPageSchema,
    search: z.string().max(200).optional().describe("Substring search across title/description"),
    filter: z
      .string()
      .max(2000)
      .optional()
      .describe(
        "Vikunja filter DSL, e.g. 'done = false && priority >= 3'. Supports comparisons, &&, ||, parentheses, labels in (...), assignees in (...).",
      ),
    sort_by: z
      .array(z.enum(["id", "title", "priority", "due_date", "created", "updated", "done", "position"]))
      .optional()
      .describe("Optional list of fields to sort by"),
    order_by: z
      .array(z.enum(["asc", "desc"]))
      .optional()
      .describe("Order for each sort_by entry; defaults to asc"),
    filter_include_nulls: z.boolean().optional().describe("Whether nulls satisfy filter comparisons"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const ListProjectTasksInputSchema = ListTasksInputSchema.extend({
  project_id: IdSchema.describe("Project ID whose tasks to list"),
  view_id: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Optional view ID. If omitted, the project's default list view is used."),
}).strict();

export const GetTaskInputSchema = z
  .object({
    id: IdSchema,
    response_format: ResponseFormatSchema,
  })
  .strict();

export const GetTaskByIdentifierInputSchema = z
  .object({
    project_id: IdSchema.describe("Project the task lives in"),
    index: z
      .number()
      .int()
      .positive()
      .describe("Per-project task index. Identifiers like '#15' mean index 15."),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const CreateTaskInputSchema = z
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
    start_date: IsoDateSchema.optional(),
    end_date: IsoDateSchema.optional(),
    priority: z.number().int().min(0).max(5).optional(),
    hex_color: z
      .string()
      .regex(/^#?[0-9a-fA-F]{6}$/)
      .optional(),
    is_favorite: z.boolean().optional(),
    bucket_id: z.number().int().positive().optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const UpdateTaskInputSchema = z
  .object({
    id: IdSchema,
    fields: TaskFieldsSchema.describe("Object with only the fields you want to change"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const DeleteTaskInputSchema = z
  .object({
    id: IdSchema,
  })
  .strict();

export const CompleteTaskInputSchema = z
  .object({
    id: IdSchema,
    done: z.boolean().default(true).describe("Pass false to reopen"),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const MoveTaskToBucketInputSchema = z
  .object({
    task_id: IdSchema.describe("Task to move"),
    project_id: IdSchema.describe("Project the task belongs to"),
    view_id: IdSchema.describe("Kanban view ID containing the buckets"),
    bucket_id: IdSchema.describe("Target bucket ID (column)"),
    keep_done: z
      .boolean()
      .default(false)
      .describe(
        "If true and the task was already marked done before the move, restore done=true after the move. Vikunja reopens tasks moved out of the done bucket by default; this flag undoes that side effect when you only intended to change column.",
      ),
    response_format: ResponseFormatSchema,
  })
  .strict();

export const BulkUpdateTasksInputSchema = z
  .object({
    task_ids: z.array(IdSchema).min(1).max(50).describe("Task IDs to update (1-50)"),
    fields: TaskFieldsSchema.describe("Values to apply to every task in task_ids"),
    response_format: ResponseFormatSchema,
  })
  .strict();
