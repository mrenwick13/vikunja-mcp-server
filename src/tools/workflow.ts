import { handleApiError } from "../services/errors.js";
import { renderError, renderResponse } from "../services/format.js";
import { detailTask } from "../services/formatters.js";
import type { ToolRegistrar } from "../services/registry.js";
import { ProposeTaskInputSchema, SetStatusInputSchema } from "../schemas/workflow.js";
import type { VikunjaBucket, VikunjaLabel, VikunjaProjectView, VikunjaTask } from "../types.js";

async function findLabelByTitle(
  client: { get: <T>(p: string, q?: Record<string, unknown>) => Promise<T> },
  title: string,
): Promise<VikunjaLabel | null> {
  const labels = await client.get<VikunjaLabel[]>("/labels", { s: title, per_page: 50 });
  const exact = (labels ?? []).find(
    (l) => l.title.toLowerCase().trim() === title.toLowerCase().trim(),
  );
  return exact ?? null;
}

async function findKanbanView(
  client: { get: <T>(p: string, q?: Record<string, unknown>) => Promise<T> },
  projectId: number,
  viewIdOverride?: number,
): Promise<VikunjaProjectView | null> {
  if (viewIdOverride !== undefined) {
    return client.get<VikunjaProjectView>(`/projects/${projectId}/views/${viewIdOverride}`);
  }
  const views = await client.get<VikunjaProjectView[]>(`/projects/${projectId}/views`);
  const kanban = (views ?? []).find((v) => v.view_kind === "kanban");
  return kanban ?? null;
}

export const registerWorkflowTools: ToolRegistrar = (server, { client }) => {
  server.registerTool(
    "vikunja_propose_task",
    {
      title: "Propose a task (workflow wrapper)",
      description: `Create a task and auto-apply the 'claude-suggested' label in one call. Designed for Michael's agreed workflow: anything Claude proposes lands with the suggestion label so Michael can find and triage it.

The task lands in the project's default bucket (typically 'Open' in projects configured for the Kanban workflow). Vikunja's own bucket-assignment logic decides where based on the view's default_bucket_id.

Args:
  - project_id, title: required
  - description, due_date, priority: optional task fields
  - suggested_label: label title to apply (default 'claude-suggested')
  - extra_labels: additional label titles to apply
  - response_format

Returns the created task with labels attached.`,
      inputSchema: ProposeTaskInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = ProposeTaskInputSchema.parse(args);
        const label = await findLabelByTitle(client, parsed.suggested_label);
        if (!label) {
          return renderError(
            `Suggested label '${parsed.suggested_label}' not found. Create it first with vikunja_create_label, or pass a different suggested_label.`,
          );
        }
        const extraLabels: VikunjaLabel[] = [];
        if (parsed.extra_labels && parsed.extra_labels.length > 0) {
          for (const title of parsed.extra_labels) {
            const l = await findLabelByTitle(client, title);
            if (!l) {
              return renderError(
                `Extra label '${title}' not found. Create it first or remove it from extra_labels.`,
              );
            }
            extraLabels.push(l);
          }
        }
        const createBody: Record<string, unknown> = { title: parsed.title };
        if (parsed.description !== undefined) createBody.description = parsed.description;
        if (parsed.due_date !== undefined) createBody.due_date = parsed.due_date;
        if (parsed.priority !== undefined) createBody.priority = parsed.priority;
        const task = await client.put<VikunjaTask>(`/projects/${parsed.project_id}/tasks`, createBody);
        const labels = [label, ...extraLabels];
        for (const l of labels) {
          await client.put<unknown>(`/tasks/${task.id}/labels`, { label_id: l.id });
        }
        return renderResponse(
          parsed.response_format,
          `Proposed task ${task.id} in project ${parsed.project_id}: ${task.title}\nLabels applied: ${labels.map((l) => l.title).join(", ")}.`,
          {
            task,
            applied_labels: labels.map((l) => ({ id: l.id, title: l.title })),
          } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_propose_task"));
      }
    },
  );

  server.registerTool(
    "vikunja_set_status",
    {
      title: "Set a task's Kanban column by status name",
      description: `Move a task into the Kanban column whose title matches the given status (case-insensitive). Encodes the agreed workflow without making callers know bucket IDs.

For the agreed five-column workflow, valid status values are: Open, To Do, Doing, In Review, Done. The match is case-insensitive on the bucket title, so 'in_review', 'In Review', and 'IN REVIEW' all work.

Side effect: same as vikunja_move_task_to_bucket — moving out of the done bucket reopens the task. Use keep_done=true to preserve done state across column-only changes.

Args:
  - task_id, project_id, status: required
  - view_id: optional override; default is the project's first Kanban view
  - keep_done: optional, default false
  - response_format`,
      inputSchema: SetStatusInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = SetStatusInputSchema.parse(args);
        const view = await findKanbanView(client, parsed.project_id, parsed.view_id);
        if (!view) {
          return renderError(
            `No Kanban view found on project ${parsed.project_id}. Create a Kanban view first with vikunja_create_view, or pass an explicit view_id.`,
          );
        }
        const buckets = await client.get<VikunjaBucket[]>(
          `/projects/${parsed.project_id}/views/${view.id}/buckets`,
        );
        const target = (buckets ?? []).find(
          (b) => b.title.toLowerCase().replace(/[_\s-]+/g, "") === parsed.status.toLowerCase().replace(/[_\s-]+/g, ""),
        );
        if (!target) {
          const available = (buckets ?? []).map((b) => b.title).join(", ");
          return renderError(
            `Status '${parsed.status}' does not match any bucket title in view ${view.id}. Available: ${available}.`,
          );
        }
        let wasDone = false;
        if (parsed.keep_done) {
          const before = await client.get<VikunjaTask>(`/tasks/${parsed.task_id}`);
          wasDone = !!before.done;
        }
        const result = await client.post<{ task?: VikunjaTask }>(
          `/projects/${parsed.project_id}/views/${view.id}/buckets/${target.id}/tasks`,
          { task_id: parsed.task_id, bucket_id: target.id },
        );
        let restored = false;
        if (parsed.keep_done && wasDone && result.task && !result.task.done) {
          await client.post<VikunjaTask>(`/tasks/${parsed.task_id}`, {
            id: parsed.task_id,
            done: true,
          });
          restored = true;
        }
        const after = await client.get<VikunjaTask>(`/tasks/${parsed.task_id}`);
        const note = restored ? " Done flag was preserved (keep_done)." : "";
        return renderResponse(
          parsed.response_format,
          `Task ${parsed.task_id} → ${target.title} (bucket ${target.id}, view ${view.id}).${note}\n\n${detailTask(after)}`,
          {
            task_id: parsed.task_id,
            project_id: parsed.project_id,
            view_id: view.id,
            bucket_id: target.id,
            bucket_title: target.title,
            keep_done_restored: restored,
            task: after,
          } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_set_status"));
      }
    },
  );
};
