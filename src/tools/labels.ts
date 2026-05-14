import { handleApiError } from "../services/errors.js";
import { buildPaginated, renderError, renderResponse } from "../services/format.js";
import { summariseLabel } from "../services/formatters.js";
import type { ToolRegistrar } from "../services/registry.js";
import { ResponseFormat } from "../schemas/common.js";
import {
  CreateLabelInputSchema,
  DeleteLabelInputSchema,
  GetLabelInputSchema,
  ListLabelsInputSchema,
  ListTaskLabelsInputSchema,
  SetTaskLabelsInputSchema,
  TaskLabelInputSchema,
  UpdateLabelInputSchema,
} from "../schemas/label.js";
import type { VikunjaLabel } from "../types.js";

export const registerLabelTools: ToolRegistrar = (server, { client, config }) => {
  server.registerTool(
    "vikunja_list_labels",
    {
      title: "List labels",
      description: `List all labels the user has access to.`,
      inputSchema: ListLabelsInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = ListLabelsInputSchema.parse(args);
        const params: Record<string, unknown> = { page: parsed.page, per_page: parsed.perPage };
        if (parsed.search) params.s = parsed.search;
        const labels = await client.get<VikunjaLabel[]>("/labels", params);
        const paged = buildPaginated(labels ?? [], parsed.page, parsed.perPage, undefined);
        const md = [`# Labels`, ``, `${paged.count} labels`, ``, ...paged.items.map((l) => `- ${summariseLabel(l)}`)].join("\n");
        return renderResponse(parsed.response_format, md, paged as unknown as Record<string, unknown>);
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_list_labels"));
      }
    },
  );

  server.registerTool(
    "vikunja_get_label",
    {
      title: "Get a label",
      description: `Fetch one label by ID.`,
      inputSchema: GetLabelInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = GetLabelInputSchema.parse(args);
        const label = await client.get<VikunjaLabel>(`/labels/${parsed.id}`);
        return renderResponse(
          parsed.response_format,
          `# ${label.title}\n\n- **ID**: ${label.id}\n- **Colour**: ${label.hex_color || "—"}\n${label.description ? `\n${label.description}` : ""}`,
          label as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_get_label"));
      }
    },
  );

  server.registerTool(
    "vikunja_create_label",
    {
      title: "Create a label",
      description: `Create a new label.`,
      inputSchema: CreateLabelInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = CreateLabelInputSchema.parse(args);
        const { response_format, ...body } = parsed;
        const label = await client.put<VikunjaLabel>("/labels", body);
        return renderResponse(
          response_format,
          `Created label ${label.id}: ${label.title}`,
          label as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_create_label"));
      }
    },
  );

  server.registerTool(
    "vikunja_update_label",
    {
      title: "Update a label",
      description: `Update a label's title, description, or hex_color.`,
      inputSchema: UpdateLabelInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = UpdateLabelInputSchema.parse(args);
        const label = await client.put<VikunjaLabel>(`/labels/${parsed.id}`, {
          id: parsed.id,
          ...parsed.fields,
        });
        return renderResponse(
          parsed.response_format,
          `Updated label ${label.id}: ${label.title}`,
          label as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_update_label"));
      }
    },
  );

  server.registerTool(
    "vikunja_delete_label",
    {
      title: "Delete a label (destructive, requires opt-in)",
      description: `Delete a label. Requires ENABLE_LABEL_DELETE=true.`,
      inputSchema: DeleteLabelInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        if (!config.enableLabelDelete) {
          return renderError(
            "vikunja_delete_label is disabled. Restart with ENABLE_LABEL_DELETE=true to enable.",
          );
        }
        const parsed = DeleteLabelInputSchema.parse(args);
        await client.delete(`/labels/${parsed.id}`);
        return renderResponse(
          ResponseFormat.MARKDOWN,
          `Deleted label ${parsed.id}.`,
          { deleted: parsed.id } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_delete_label"));
      }
    },
  );

  server.registerTool(
    "vikunja_list_task_labels",
    {
      title: "List labels on a task",
      description: `List labels currently attached to a task.`,
      inputSchema: ListTaskLabelsInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = ListTaskLabelsInputSchema.parse(args);
        const labels = await client.get<VikunjaLabel[]>(`/tasks/${parsed.task_id}/labels`, {
          page: parsed.page,
          per_page: parsed.perPage,
        });
        const paged = buildPaginated(labels ?? [], parsed.page, parsed.perPage, undefined);
        const md = [
          `# Labels on task ${parsed.task_id}`,
          ``,
          ...paged.items.map((l) => `- ${summariseLabel(l)}`),
        ].join("\n");
        return renderResponse(parsed.response_format, md, paged as unknown as Record<string, unknown>);
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_list_task_labels"));
      }
    },
  );

  server.registerTool(
    "vikunja_add_label_to_task",
    {
      title: "Add a label to a task",
      description: `Attach an existing label to a task.`,
      inputSchema: TaskLabelInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = TaskLabelInputSchema.parse(args);
        const result = await client.put<VikunjaLabel>(`/tasks/${parsed.task_id}/labels`, {
          label_id: parsed.label_id,
        });
        return renderResponse(
          parsed.response_format,
          `Added label ${parsed.label_id} to task ${parsed.task_id}.`,
          result as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_add_label_to_task"));
      }
    },
  );

  server.registerTool(
    "vikunja_remove_label_from_task",
    {
      title: "Remove a label from a task",
      description: `Detach a label from a task.`,
      inputSchema: TaskLabelInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = TaskLabelInputSchema.parse(args);
        await client.delete(`/tasks/${parsed.task_id}/labels/${parsed.label_id}`);
        return renderResponse(
          parsed.response_format,
          `Removed label ${parsed.label_id} from task ${parsed.task_id}.`,
          { task_id: parsed.task_id, label_id: parsed.label_id } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_remove_label_from_task"));
      }
    },
  );

  server.registerTool(
    "vikunja_set_task_labels",
    {
      title: "Replace all labels on a task",
      description: `Replace the entire label set on a task with the provided list. Pass an empty array to clear all labels.`,
      inputSchema: SetTaskLabelsInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = SetTaskLabelsInputSchema.parse(args);
        const result = await client.post<unknown>(`/tasks/${parsed.task_id}/labels/bulk`, {
          labels: parsed.label_ids.map((id) => ({ id })),
        });
        return renderResponse(
          parsed.response_format,
          `Set ${parsed.label_ids.length} label(s) on task ${parsed.task_id}.`,
          { task_id: parsed.task_id, label_ids: parsed.label_ids, result } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_set_task_labels"));
      }
    },
  );
};
