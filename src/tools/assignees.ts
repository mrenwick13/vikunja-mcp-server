import { handleApiError } from "../services/errors.js";
import { buildPaginated, renderError, renderResponse } from "../services/format.js";
import type { ToolRegistrar } from "../services/registry.js";
import { ResponseFormat } from "../schemas/common.js";
import {
  AddAssigneeInputSchema,
  ListAssigneesInputSchema,
  RemoveAssigneeInputSchema,
} from "../schemas/assignee.js";
import type { VikunjaUser } from "../types.js";

export const registerAssigneeTools: ToolRegistrar = (server, { client }) => {
  server.registerTool(
    "vikunja_list_assignees",
    {
      title: "List assignees on a task",
      description: `List users assigned to a task.`,
      inputSchema: ListAssigneesInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = ListAssigneesInputSchema.parse(args);
        const users = await client.get<VikunjaUser[]>(`/tasks/${parsed.task_id}/assignees`, {
          page: parsed.page,
          per_page: parsed.perPage,
        });
        const paged = buildPaginated(users ?? [], parsed.page, parsed.perPage, undefined);
        const md = [
          `# Assignees on task ${parsed.task_id}`,
          ``,
          ...paged.items.map((u) => `- ${u.username || u.name || `user#${u.id}`}`),
        ].join("\n");
        return renderResponse(parsed.response_format, md, paged as unknown as Record<string, unknown>);
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_list_assignees"));
      }
    },
  );

  server.registerTool(
    "vikunja_add_assignee",
    {
      title: "Add an assignee to a task",
      description: `Assign a user to a task by user ID.`,
      inputSchema: AddAssigneeInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = AddAssigneeInputSchema.parse(args);
        const result = await client.put<unknown>(`/tasks/${parsed.task_id}/assignees`, {
          user_id: parsed.user_id,
        });
        return renderResponse(
          parsed.response_format,
          `Assigned user ${parsed.user_id} to task ${parsed.task_id}.`,
          { result } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_add_assignee"));
      }
    },
  );

  server.registerTool(
    "vikunja_remove_assignee",
    {
      title: "Remove an assignee from a task",
      description: `Unassign a user from a task.`,
      inputSchema: RemoveAssigneeInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = RemoveAssigneeInputSchema.parse(args);
        await client.delete(`/tasks/${parsed.task_id}/assignees/${parsed.user_id}`);
        return renderResponse(
          ResponseFormat.MARKDOWN,
          `Unassigned user ${parsed.user_id} from task ${parsed.task_id}.`,
          { task_id: parsed.task_id, user_id: parsed.user_id } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_remove_assignee"));
      }
    },
  );
};
