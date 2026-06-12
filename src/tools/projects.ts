import { handleApiError } from "../services/errors.js";
import { buildPaginated, renderError, renderResponse } from "../services/format.js";
import { detailProject, summariseProject } from "../services/formatters.js";
import type { ToolRegistrar } from "../services/registry.js";
import { ResponseFormat } from "../schemas/common.js";
import {
  ArchiveProjectInputSchema,
  CreateProjectInputSchema,
  DeleteProjectInputSchema,
  DuplicateProjectInputSchema,
  GetProjectInputSchema,
  ListProjectsInputSchema,
  UpdateProjectInputSchema,
} from "../schemas/project.js";
import type { VikunjaProject } from "../types.js";

export const registerProjectTools: ToolRegistrar = (server, { client, config }) => {
  server.registerTool(
    "vikunja_list_projects",
    {
      title: "List projects",
      description: `List projects the authenticated user can see. Supports search, archive filter, and pagination.

Note: Vikunja exposes saved filters as virtual projects with negative IDs. To find your saved filters, filter results to negative IDs after listing.`,
      inputSchema: ListProjectsInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = ListProjectsInputSchema.parse(args);
        const params: Record<string, unknown> = {
          page: parsed.page,
          per_page: parsed.perPage,
        };
        if (parsed.search) params.s = parsed.search;
        if (parsed.is_archived !== undefined) params.is_archived = parsed.is_archived;
        const { data: projects, pagination } = await client.getList<VikunjaProject[]>("/projects", params);
        const paged = buildPaginated(projects ?? [], parsed.page, parsed.perPage, pagination);
        const md = [
          `# Projects`,
          ``,
          `${paged.count} (page ${paged.page})${paged.has_more ? ", more available" : ""}`,
          ``,
          ...paged.items.map((p) => `- ${summariseProject(p)}`),
        ].join("\n");
        return renderResponse(parsed.response_format, md, paged as unknown as Record<string, unknown>);
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_list_projects"));
      }
    },
  );

  server.registerTool(
    "vikunja_get_project",
    {
      title: "Get a project",
      description: `Fetch a single project by ID, including its views.`,
      inputSchema: GetProjectInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = GetProjectInputSchema.parse(args);
        const project = await client.get<VikunjaProject>(`/projects/${parsed.id}`);
        return renderResponse(
          parsed.response_format,
          detailProject(project),
          project as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_get_project"));
      }
    },
  );

  server.registerTool(
    "vikunja_create_project",
    {
      title: "Create a project",
      description: `Create a new project. parent_project_id 0 creates a top-level project.`,
      inputSchema: CreateProjectInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = CreateProjectInputSchema.parse(args);
        const { response_format, ...body } = parsed;
        const project = await client.put<VikunjaProject>("/projects", body);
        return renderResponse(
          response_format,
          `Created project ${project.id}: ${project.title}`,
          project as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_create_project"));
      }
    },
  );

  server.registerTool(
    "vikunja_update_project",
    {
      title: "Update a project",
      description: `Update a project. Pass only the fields you want to change.`,
      inputSchema: UpdateProjectInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = UpdateProjectInputSchema.parse(args);
        // Vikunja's UpdateProject writes title, is_archived, identifier, hex_color,
        // parent_project_id, and position unconditionally from the incoming struct,
        // so a partial payload would blank or reset the omitted columns. Fetch the
        // full project and merge the changes in, as the official frontend does.
        const current = await client.get<VikunjaProject>(`/projects/${parsed.id}`);
        const project = await client.post<VikunjaProject>(`/projects/${parsed.id}`, {
          ...current,
          ...parsed.fields,
          id: parsed.id,
        });
        return renderResponse(
          parsed.response_format,
          `Updated project ${project.id}: ${project.title}`,
          project as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_update_project"));
      }
    },
  );

  server.registerTool(
    "vikunja_archive_project",
    {
      title: "Archive or unarchive a project",
      description: `Set or clear a project's archived flag. Archived projects are hidden from most views but data is preserved.`,
      inputSchema: ArchiveProjectInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = ArchiveProjectInputSchema.parse(args);
        // Fetch-merge-write: a bare {id, is_archived} payload would fail (Title is
        // required) or blank the columns UpdateProject always writes. See
        // vikunja_update_project above.
        const current = await client.get<VikunjaProject>(`/projects/${parsed.id}`);
        const project = await client.post<VikunjaProject>(`/projects/${parsed.id}`, {
          ...current,
          id: parsed.id,
          is_archived: parsed.archived,
        });
        return renderResponse(
          parsed.response_format,
          `Project ${project.id} ${project.is_archived ? "archived" : "unarchived"}: ${project.title}`,
          project as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_archive_project"));
      }
    },
  );

  server.registerTool(
    "vikunja_duplicate_project",
    {
      title: "Duplicate a project",
      description: `Duplicate an existing project, including its tasks and views. The new project is created at the specified parent (or top-level if omitted).`,
      inputSchema: DuplicateProjectInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = DuplicateProjectInputSchema.parse(args);
        const body: Record<string, unknown> = {};
        if (parsed.parent_project_id !== undefined) body.parent_project_id = parsed.parent_project_id;
        const project = await client.put<VikunjaProject>(`/projects/${parsed.id}/duplicate`, body);
        return renderResponse(
          parsed.response_format,
          `Duplicated project ${parsed.id} → ${project.id}: ${project.title}`,
          project as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_duplicate_project"));
      }
    },
  );

  server.registerTool(
    "vikunja_delete_project",
    {
      title: "Delete a project (destructive, requires opt-in)",
      description: `Delete a project and all its tasks. Requires ENABLE_PROJECT_DELETE=true.`,
      inputSchema: DeleteProjectInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        if (!config.enableProjectDelete) {
          return renderError(
            "vikunja_delete_project is disabled. Restart with ENABLE_PROJECT_DELETE=true to enable.",
          );
        }
        const parsed = DeleteProjectInputSchema.parse(args);
        await client.delete(`/projects/${parsed.id}`);
        return renderResponse(
          ResponseFormat.MARKDOWN,
          `Deleted project ${parsed.id}.`,
          { deleted: parsed.id } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_delete_project"));
      }
    },
  );
};
