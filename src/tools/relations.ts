import { handleApiError } from "../services/errors.js";
import { renderError, renderResponse } from "../services/format.js";
import type { ToolRegistrar } from "../services/registry.js";
import { ResponseFormat } from "../schemas/common.js";
import {
  CreateRelationInputSchema,
  DeleteRelationInputSchema,
} from "../schemas/relation.js";

export const registerRelationTools: ToolRegistrar = (server, { client }) => {
  server.registerTool(
    "vikunja_create_relation",
    {
      title: "Create a relation between two tasks",
      description: `Create a typed relation between two tasks (e.g. subtask, blocking, duplicateof). To see existing relations, fetch the source task with vikunja_get_task and inspect related_tasks.`,
      inputSchema: CreateRelationInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = CreateRelationInputSchema.parse(args);
        const result = await client.put<unknown>(`/tasks/${parsed.task_id}/relations`, {
          task_id: parsed.task_id,
          other_task_id: parsed.other_task_id,
          relation_kind: parsed.relation_kind,
        });
        return renderResponse(
          parsed.response_format,
          `Linked task ${parsed.task_id} ${parsed.relation_kind} ${parsed.other_task_id}.`,
          { result } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_create_relation"));
      }
    },
  );

  server.registerTool(
    "vikunja_delete_relation",
    {
      title: "Delete a relation between two tasks",
      description: `Remove a typed relation between two tasks. relation_kind must match the original.`,
      inputSchema: DeleteRelationInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = DeleteRelationInputSchema.parse(args);
        await client.delete(
          `/tasks/${parsed.task_id}/relations/${parsed.relation_kind}/${parsed.other_task_id}`,
        );
        return renderResponse(
          ResponseFormat.MARKDOWN,
          `Removed ${parsed.relation_kind} relation between ${parsed.task_id} and ${parsed.other_task_id}.`,
          parsed as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_delete_relation"));
      }
    },
  );
};
