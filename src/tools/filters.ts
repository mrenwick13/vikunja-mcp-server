import { handleApiError } from "../services/errors.js";
import { renderError, renderResponse } from "../services/format.js";
import type { ToolRegistrar } from "../services/registry.js";
import { ResponseFormat } from "../schemas/common.js";
import {
  CreateFilterInputSchema,
  DeleteFilterInputSchema,
  GetFilterInputSchema,
  UpdateFilterInputSchema,
} from "../schemas/filter.js";
import type { VikunjaSavedFilter } from "../types.js";

export const registerFilterTools: ToolRegistrar = (server, { client, config }) => {
  server.registerTool(
    "vikunja_get_filter",
    {
      title: "Get a saved filter",
      description: `Fetch one saved filter by ID.

Saved filters are stored at /filters/{id} but they also appear as virtual projects with negative IDs in vikunja_list_projects. To list all your saved filters, use vikunja_list_projects and keep entries whose id is negative.`,
      inputSchema: GetFilterInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = GetFilterInputSchema.parse(args);
        const filter = await client.get<VikunjaSavedFilter>(`/filters/${parsed.id}`);
        return renderResponse(
          parsed.response_format,
          `# ${filter.title}\n\n- **ID**: ${filter.id}\n- **Favourite**: ${filter.is_favorite ? "yes" : "no"}\n${filter.description ? `\n${filter.description}` : ""}`,
          filter as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_get_filter"));
      }
    },
  );

  server.registerTool(
    "vikunja_create_filter",
    {
      title: "Create a saved filter",
      description: `Create a saved filter using Vikunja's filter DSL.

The 'filters' object holds:
  - filter: filter DSL (e.g. 'priority >= 3 && done = false')
  - s: optional search string
  - filter_include_nulls: optional boolean
  - sort_by, order_by: optional sort config`,
      inputSchema: CreateFilterInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = CreateFilterInputSchema.parse(args);
        const { response_format, ...body } = parsed;
        const filter = await client.put<VikunjaSavedFilter>("/filters", body);
        return renderResponse(
          response_format,
          `Created saved filter ${filter.id}: ${filter.title}`,
          filter as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_create_filter"));
      }
    },
  );

  server.registerTool(
    "vikunja_update_filter",
    {
      title: "Update a saved filter",
      description: `Update a saved filter's title, description, filters payload, or favourite flag.`,
      inputSchema: UpdateFilterInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = UpdateFilterInputSchema.parse(args);
        const filter = await client.post<VikunjaSavedFilter>(`/filters/${parsed.id}`, {
          id: parsed.id,
          ...parsed.fields,
        });
        return renderResponse(
          parsed.response_format,
          `Updated saved filter ${filter.id}: ${filter.title}`,
          filter as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_update_filter"));
      }
    },
  );

  server.registerTool(
    "vikunja_delete_filter",
    {
      title: "Delete a saved filter (destructive, requires opt-in)",
      description: `Delete a saved filter. Requires ENABLE_FILTER_DELETE=true.`,
      inputSchema: DeleteFilterInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        if (!config.enableFilterDelete) {
          return renderError(
            "vikunja_delete_filter is disabled. Restart with ENABLE_FILTER_DELETE=true to enable.",
          );
        }
        const parsed = DeleteFilterInputSchema.parse(args);
        await client.delete(`/filters/${parsed.id}`);
        return renderResponse(
          ResponseFormat.MARKDOWN,
          `Deleted saved filter ${parsed.id}.`,
          { deleted: parsed.id } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_delete_filter"));
      }
    },
  );
};
