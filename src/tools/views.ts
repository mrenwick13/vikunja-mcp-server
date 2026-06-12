import { handleApiError } from "../services/errors.js";
import { renderError, renderResponse } from "../services/format.js";
import { summariseView } from "../services/formatters.js";
import type { ToolRegistrar } from "../services/registry.js";
import { ResponseFormat } from "../schemas/common.js";
import {
  CreateViewInputSchema,
  DeleteViewInputSchema,
  GetViewInputSchema,
  ListViewsInputSchema,
  UpdateViewInputSchema,
} from "../schemas/view.js";
import type { VikunjaProjectView } from "../types.js";

export const registerViewTools: ToolRegistrar = (server, { client, config }) => {
  server.registerTool(
    "vikunja_list_views",
    {
      title: "List project views",
      description: `List the views (List, Gantt, Table, Kanban, or custom) defined on a project.`,
      inputSchema: ListViewsInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = ListViewsInputSchema.parse(args);
        const views = await client.get<VikunjaProjectView[]>(`/projects/${parsed.project_id}/views`);
        const md = [
          `# Views in project ${parsed.project_id}`,
          ``,
          `${views.length} view(s)`,
          ``,
          ...views.map((v) => `- ${summariseView(v)}`),
        ].join("\n");
        return renderResponse(parsed.response_format, md, { views } as unknown as Record<string, unknown>);
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_list_views"));
      }
    },
  );

  server.registerTool(
    "vikunja_get_view",
    {
      title: "Get a project view",
      description: `Fetch one view by project_id + view id. Returns the view including its bucket configuration mode, default and done bucket IDs, and any filter.`,
      inputSchema: GetViewInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = GetViewInputSchema.parse(args);
        const view = await client.get<VikunjaProjectView>(
          `/projects/${parsed.project_id}/views/${parsed.id}`,
        );
        const md = [
          `# ${view.title}`,
          ``,
          `- **ID**: ${view.id}`,
          `- **Kind**: ${view.view_kind}`,
          `- **Project**: ${view.project_id}`,
          `- **Bucket mode**: ${view.bucket_configuration_mode ?? "none"}`,
          ...(view.default_bucket_id ? [`- **Default bucket**: ${view.default_bucket_id}`] : []),
          ...(view.done_bucket_id ? [`- **Done bucket**: ${view.done_bucket_id}`] : []),
        ].join("\n");
        return renderResponse(parsed.response_format, md, view as unknown as Record<string, unknown>);
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_get_view"));
      }
    },
  );

  server.registerTool(
    "vikunja_create_view",
    {
      title: "Create a project view",
      description: `Create a new view on a project. Common view kinds: list, gantt, table, kanban.`,
      inputSchema: CreateViewInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = CreateViewInputSchema.parse(args);
        const { project_id, response_format, ...body } = parsed;
        const view = await client.put<VikunjaProjectView>(`/projects/${project_id}/views`, body);
        return renderResponse(
          response_format,
          `Created view ${view.id}: ${view.title} (${view.view_kind})`,
          view as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_create_view"));
      }
    },
  );

  server.registerTool(
    "vikunja_update_view",
    {
      title: "Update a project view",
      description: `Update a view's title, kind, bucket configuration, or filter.`,
      inputSchema: UpdateViewInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = UpdateViewInputSchema.parse(args);
        // Vikunja's view update writes all columns from the incoming struct, so a
        // partial payload would blank title/kind/bucket config. Fetch-merge-write.
        const current = await client.get<VikunjaProjectView>(
          `/projects/${parsed.project_id}/views/${parsed.id}`,
        );
        const view = await client.post<VikunjaProjectView>(
          `/projects/${parsed.project_id}/views/${parsed.id}`,
          { ...current, ...parsed.fields, id: parsed.id },
        );
        return renderResponse(
          parsed.response_format,
          `Updated view ${view.id}: ${view.title}`,
          view as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_update_view"));
      }
    },
  );

  server.registerTool(
    "vikunja_delete_view",
    {
      title: "Delete a project view (destructive, requires opt-in)",
      description: `Delete a view. Requires ENABLE_VIEW_DELETE=true.`,
      inputSchema: DeleteViewInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        if (!config.enableViewDelete) {
          return renderError(
            "vikunja_delete_view is disabled. Restart with ENABLE_VIEW_DELETE=true to enable.",
          );
        }
        const parsed = DeleteViewInputSchema.parse(args);
        await client.delete(`/projects/${parsed.project_id}/views/${parsed.id}`);
        return renderResponse(
          ResponseFormat.MARKDOWN,
          `Deleted view ${parsed.id} from project ${parsed.project_id}.`,
          { deleted: parsed.id } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_delete_view"));
      }
    },
  );
};
