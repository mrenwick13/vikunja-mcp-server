import type { VikunjaClient } from "../services/api.js";
import { handleApiError } from "../services/errors.js";
import { buildPaginated, renderError, renderResponse } from "../services/format.js";
import { detailTask, summariseTask } from "../services/formatters.js";
import { descriptionToHtml } from "../services/markdown.js";
import type { ToolRegistrar } from "../services/registry.js";
import {
  BulkUpdateTasksInputSchema,
  CompleteTaskInputSchema,
  CreateTaskInputSchema,
  DeleteTaskInputSchema,
  GetTaskByIdentifierInputSchema,
  GetTaskInputSchema,
  ListProjectTasksInputSchema,
  ListTasksInputSchema,
  MoveTaskToBucketInputSchema,
  UpdateTaskInputSchema,
} from "../schemas/task.js";
import type { VikunjaProjectView, VikunjaTask } from "../types.js";
import { ResponseFormat } from "../schemas/common.js";

// Vikunja's POST /tasks/{id} is a full replace: any mutable field missing
// from the body is reset to its zero value, so a partial update silently
// wipes description and resets priority. Fetch the task and re-send its
// current scalar fields underneath the requested changes. bucket_id and
// position are deliberately excluded — bucket moves carry view side effects
// and go through vikunja_move_task_to_bucket.
const TASK_MERGE_FIELDS = [
  "title",
  "description",
  "done",
  "priority",
  "percent_done",
  "due_date",
  "start_date",
  "end_date",
  "repeat_after",
  "repeat_mode",
  "hex_color",
  "is_favorite",
] as const;

async function mergedUpdateBody(
  client: VikunjaClient,
  id: number,
  overrides: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const current = await client.get<VikunjaTask>(`/tasks/${id}`);
  const base: Record<string, unknown> = {};
  for (const field of TASK_MERGE_FIELDS) {
    const value = (current as unknown as Record<string, unknown>)[field];
    if (value !== undefined && value !== null) base[field] = value;
  }
  return { id, ...base, ...overrides };
}

function buildListParams(args: {
  page: number;
  perPage: number;
  search?: string;
  filter?: string;
  sort_by?: string[];
  order_by?: string[];
  filter_include_nulls?: boolean;
}): Record<string, unknown> {
  const params: Record<string, unknown> = {
    page: args.page,
    per_page: args.perPage,
  };
  if (args.search) params.s = args.search;
  if (args.filter) params.filter = args.filter;
  if (args.sort_by && args.sort_by.length > 0) params.sort_by = args.sort_by;
  if (args.order_by && args.order_by.length > 0) params.order_by = args.order_by;
  if (args.filter_include_nulls !== undefined)
    params.filter_include_nulls = args.filter_include_nulls;
  return params;
}

function renderTaskList(
  tasks: VikunjaTask[],
  page: number,
  perPage: number,
  format: ResponseFormat,
  heading: string,
) {
  const paged = buildPaginated(tasks, page, perPage, undefined);
  const md = [
    `# ${heading}`,
    ``,
    `${paged.count} tasks (page ${paged.page}, perPage ${paged.perPage})${paged.has_more ? ", more available" : ""}`,
    ``,
    ...paged.items.map((t) => `- ${summariseTask(t)}`),
  ].join("\n");
  return renderResponse(format, md, paged as unknown as Record<string, unknown>);
}

export const registerTaskTools: ToolRegistrar = (server, { client, config }) => {
  server.registerTool(
    "vikunja_list_tasks",
    {
      title: "List tasks across all projects",
      description: `List tasks across all projects the authenticated user can see, with optional search, filter DSL, and sort.

Filter DSL supports comparisons (=, !=, <, <=, >, >=), boolean operators (&&, ||), parentheses, and 'in (...)' for labels/assignees. Example: 'done = false && priority >= 3'.

Args:
  - page, perPage: pagination (perPage capped at 50)
  - search: substring match on title/description
  - filter: filter DSL string
  - sort_by, order_by: parallel arrays for multi-field sort
  - filter_include_nulls: whether null fields satisfy filter comparisons
  - response_format: 'markdown' (default) or 'json'

Returns paginated list of task objects. Use vikunja_list_project_tasks if you have a specific project context.`,
      inputSchema: ListTasksInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      void config;
      try {
        const parsed = ListTasksInputSchema.parse(args);
        const params = buildListParams(parsed);
        const tasks = await client.get<VikunjaTask[]>("/tasks/all", params);
        return renderTaskList(tasks ?? [], parsed.page, parsed.perPage, parsed.response_format, "Tasks (all projects)");
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_list_tasks"));
      }
    },
  );

  server.registerTool(
    "vikunja_list_project_tasks",
    {
      title: "List tasks in a project",
      description: `List tasks in a specific project, optionally scoped to a project view (e.g. a Kanban view to honour its filter).

Response shape varies by view kind: a list/table/gantt view returns a flat array of tasks; a Kanban view returns an array of buckets each containing its tasks. This tool detects the shape and renders appropriately, while always exposing a flat 'tasks' field plus an optional 'buckets' field in the structured output.

Args:
  - project_id: project to query
  - view_id (optional): if given, uses /projects/{project_id}/views/{view_id}/tasks so the view's filter applies
  - other args same as vikunja_list_tasks`,
      inputSchema: ListProjectTasksInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = ListProjectTasksInputSchema.parse(args);
        const params = buildListParams(parsed);
        const path = parsed.view_id
          ? `/projects/${parsed.project_id}/views/${parsed.view_id}/tasks`
          : `/projects/${parsed.project_id}/views/0/tasks`;
        const raw = await client.get<unknown>(path, params);
        const arr = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
        const looksLikeBuckets =
          arr.length > 0 &&
          typeof arr[0] === "object" &&
          arr[0] !== null &&
          ("tasks" in arr[0] || "limit" in arr[0]);
        if (looksLikeBuckets) {
          const buckets = arr as unknown as Array<{
            id: number;
            title: string;
            count?: number;
            limit?: number;
            tasks?: VikunjaTask[];
          }>;
          const flatTasks: VikunjaTask[] = buckets.flatMap((b) => b.tasks ?? []);
          const md = [
            `# Kanban view ${parsed.view_id ?? "(default)"} — project ${parsed.project_id}`,
            ``,
            `${flatTasks.length} task(s) across ${buckets.length} bucket(s)`,
            ``,
            ...buckets.flatMap((b) => {
              const header = `## ${b.title} (#${b.id}, ${b.tasks?.length ?? 0} tasks${b.limit ? `, cap ${b.limit}` : ""})`;
              const rows = (b.tasks ?? []).map((t) => `- ${summariseTask(t)}`);
              return [header, ...(rows.length > 0 ? rows : ["_(empty)_"]), ""];
            }),
          ].join("\n");
          return renderResponse(parsed.response_format, md, {
            shape: "kanban",
            buckets,
            tasks: flatTasks,
            count: flatTasks.length,
          } as unknown as Record<string, unknown>);
        }
        return renderTaskList(
          (raw as VikunjaTask[]) ?? [],
          parsed.page,
          parsed.perPage,
          parsed.response_format,
          `Tasks in project ${parsed.project_id}`,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_list_project_tasks"));
      }
    },
  );

  server.registerTool(
    "vikunja_get_task",
    {
      title: "Get a single task",
      description: `Fetch one task by ID with full detail (description, labels, assignees, related tasks).`,
      inputSchema: GetTaskInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = GetTaskInputSchema.parse(args);
        const task = await client.get<VikunjaTask>(`/tasks/${parsed.id}`);
        return renderResponse(
          parsed.response_format,
          detailTask(task),
          task as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_get_task"));
      }
    },
  );

  server.registerTool(
    "vikunja_get_task_by_identifier",
    {
      title: "Get a task by its per-project identifier",
      description: `Fetch a task by its per-project index (the number in identifiers like '#15'). Useful when you know the project context and the identifier shown in the UI.

Vikunja v1.1.0 does not expose its native /by-index endpoint, so this tool emulates the lookup by walking the project's Kanban view tasks and matching on the 'index' field. Requires the project to have a Kanban view defined; if not, the tool returns an actionable error.

Args:
  - project_id: project the task belongs to
  - index: the integer part of the identifier (15 for '#15')
  - response_format`,
      inputSchema: GetTaskByIdentifierInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = GetTaskByIdentifierInputSchema.parse(args);
        const views = await client.get<VikunjaProjectView[]>(
          `/projects/${parsed.project_id}/views`,
        );
        const kanban = (views ?? []).find((v) => v.view_kind === "kanban");
        if (!kanban) {
          return renderError(
            `vikunja_get_task_by_identifier: project ${parsed.project_id} has no Kanban view, which this tool needs to enumerate all tasks (including completed ones). Create a Kanban view or fall back to vikunja_get_task with the numeric task id.`,
          );
        }
        const PER_PAGE = 50;
        const MAX_PAGES = 10;
        for (let page = 1; page <= MAX_PAGES; page++) {
          const raw = await client.get<unknown>(
            `/projects/${parsed.project_id}/views/${kanban.id}/tasks`,
            { page, per_page: PER_PAGE },
          );
          const buckets = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
          const tasks: VikunjaTask[] = buckets.flatMap(
            (b) => (b.tasks as VikunjaTask[] | undefined) ?? [],
          );
          const found = tasks.find((t) => t.index === parsed.index);
          if (found) {
            return renderResponse(
              parsed.response_format,
              detailTask(found),
              found as unknown as Record<string, unknown>,
            );
          }
          if (tasks.length === 0 || tasks.length < PER_PAGE) break;
        }
        return renderError(
          `vikunja_get_task_by_identifier: no task with index ${parsed.index} found in project ${parsed.project_id} (Kanban view ${kanban.id}).`,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_get_task_by_identifier"));
      }
    },
  );

  server.registerTool(
    "vikunja_create_task",
    {
      title: "Create a task",
      description: `Create a new task in a project. Title is required; everything else is optional. The task lands in the project's default bucket unless bucket_id is provided.`,
      inputSchema: CreateTaskInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = CreateTaskInputSchema.parse(args);
        const { project_id, response_format, ...rest } = parsed;
        if (rest.description !== undefined) {
          rest.description = descriptionToHtml(rest.description);
        }
        const task = await client.put<VikunjaTask>(`/projects/${project_id}/tasks`, rest);
        return renderResponse(
          response_format,
          `Created task ${task.id}: ${task.title}`,
          task as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_create_task"));
      }
    },
  );

  server.registerTool(
    "vikunja_update_task",
    {
      title: "Update a task",
      description: `Update an existing task. Pass only the fields you want to change in the 'fields' object.

Field semantics:
  - bucket_id is honoured by this generic update; vikunja_move_task_to_bucket is the dedicated alternative when you also know view_id.
  - due_date / start_date / end_date accept ISO 8601 or an empty string to clear.
  - priority is 0-5 (0 = none, 5 = highest).`,
      inputSchema: UpdateTaskInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = UpdateTaskInputSchema.parse(args);
        const fields = { ...parsed.fields };
        if (fields.description !== undefined) {
          fields.description = descriptionToHtml(fields.description);
        }
        const task = await client.post<VikunjaTask>(
          `/tasks/${parsed.id}`,
          await mergedUpdateBody(client, parsed.id, fields),
        );
        return renderResponse(
          parsed.response_format,
          `Updated task ${task.id}: ${task.title}`,
          task as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_update_task"));
      }
    },
  );

  server.registerTool(
    "vikunja_complete_task",
    {
      title: "Mark a task complete or reopen it",
      description: `Mark a task done (default) or reopen it. Convenience wrapper over vikunja_update_task with field 'done'.`,
      inputSchema: CompleteTaskInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = CompleteTaskInputSchema.parse(args);
        const task = await client.post<VikunjaTask>(
          `/tasks/${parsed.id}`,
          await mergedUpdateBody(client, parsed.id, { done: parsed.done }),
        );
        return renderResponse(
          parsed.response_format,
          `Task ${task.id} marked ${task.done ? "done" : "open"}: ${task.title}`,
          task as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_complete_task"));
      }
    },
  );

  server.registerTool(
    "vikunja_move_task_to_bucket",
    {
      title: "Move a task to a Kanban bucket",
      description: `Move a task into a specific Kanban bucket (column) using Vikunja's dedicated bucket-move endpoint.

Side effect: Vikunja drives the task's done state from bucket membership. Moving a task INTO the view's done_bucket_id sets done=true; moving OUT of it sets done=false. Use keep_done=true to preserve a previously-done state when changing columns purely for workflow reasons.

Args:
  - task_id, project_id, view_id, bucket_id: all required
  - keep_done (optional, default false): if true and the task was done before the move, restore done=true after
  - response_format

The task remains in its project; this changes only its bucket assignment within the named view.`,
      inputSchema: MoveTaskToBucketInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = MoveTaskToBucketInputSchema.parse(args);
        let wasDone = false;
        if (parsed.keep_done) {
          const before = await client.get<VikunjaTask>(`/tasks/${parsed.task_id}`);
          wasDone = !!before.done;
        }
        const path = `/projects/${parsed.project_id}/views/${parsed.view_id}/buckets/${parsed.bucket_id}/tasks`;
        const result = await client.post<{
          task_id: number;
          bucket_id: number;
          project_view_id: number;
          task: VikunjaTask;
        }>(path, {
          task_id: parsed.task_id,
          bucket_id: parsed.bucket_id,
        });
        let restored = false;
        if (parsed.keep_done && wasDone && result.task && !result.task.done) {
          await client.post<VikunjaTask>(`/tasks/${parsed.task_id}`, {
            id: parsed.task_id,
            done: true,
          });
          restored = true;
        }
        const note = restored
          ? " Task was previously done and has been re-marked done (keep_done)."
          : "";
        return renderResponse(
          parsed.response_format,
          `Moved task ${parsed.task_id} into bucket ${parsed.bucket_id} (view ${parsed.view_id}, project ${parsed.project_id}).${note}`,
          { ...result, keep_done_restored: restored } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_move_task_to_bucket"));
      }
    },
  );

  server.registerTool(
    "vikunja_bulk_update_tasks",
    {
      title: "Bulk update tasks",
      description: `Apply the same field changes to many tasks atomically (1-50 task IDs). Useful for mass priority changes, marking many tasks done, or relocating to a project.

This calls Vikunja's /tasks/bulk endpoint. The 'fields' object describes which fields to update; only those listed are written.`,
      inputSchema: BulkUpdateTasksInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = BulkUpdateTasksInputSchema.parse(args);
        const fields = { ...parsed.fields };
        if (fields.description !== undefined) {
          fields.description = descriptionToHtml(fields.description);
        }
        const fieldNames = Object.keys(fields);
        const result = await client.post<unknown>("/tasks/bulk", {
          task_ids: parsed.task_ids,
          fields: fieldNames,
          values: fields,
        });
        const tasks = Array.isArray(result) ? (result as VikunjaTask[]) : [];
        const summary = tasks.length
          ? tasks.map((t) => `- ${summariseTask(t)}`).join("\n")
          : "Bulk update completed; server returned no per-task echo.";
        return renderResponse(
          parsed.response_format,
          `# Bulk update\n\nApplied ${fieldNames.join(", ") || "(no changes)"} to ${parsed.task_ids.length} task(s).\n\n${summary}`,
          { updated: tasks.length, tasks } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_bulk_update_tasks"));
      }
    },
  );

  server.registerTool(
    "vikunja_delete_task",
    {
      title: "Delete a task (destructive, requires opt-in)",
      description: `Delete a task by ID. Requires the server to be started with ENABLE_TASK_DELETE=true; otherwise this returns an error explaining how to enable it.`,
      inputSchema: DeleteTaskInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        if (!config.enableTaskDelete) {
          return renderError(
            "vikunja_delete_task is disabled. Restart the MCP server with ENABLE_TASK_DELETE=true to enable.",
          );
        }
        const parsed = DeleteTaskInputSchema.parse(args);
        await client.delete(`/tasks/${parsed.id}`);
        return renderResponse(
          ResponseFormat.MARKDOWN,
          `Deleted task ${parsed.id}.`,
          { deleted: parsed.id } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_delete_task"));
      }
    },
  );
};
