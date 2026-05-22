import { handleApiError } from "../services/errors.js";
import { buildPaginated, renderError, renderResponse } from "../services/format.js";
import { summariseComment } from "../services/formatters.js";
import { descriptionToHtml } from "../services/markdown.js";
import type { ToolRegistrar } from "../services/registry.js";
import { ResponseFormat } from "../schemas/common.js";
import {
  CreateCommentInputSchema,
  DeleteCommentInputSchema,
  GetCommentInputSchema,
  ListCommentsInputSchema,
  UpdateCommentInputSchema,
} from "../schemas/comment.js";
import type { VikunjaTaskComment } from "../types.js";

export const registerCommentTools: ToolRegistrar = (server, { client, config }) => {
  server.registerTool(
    "vikunja_list_comments",
    {
      title: "List comments on a task",
      description: `List comments attached to a task, paginated.`,
      inputSchema: ListCommentsInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = ListCommentsInputSchema.parse(args);
        const comments = await client.get<VikunjaTaskComment[]>(
          `/tasks/${parsed.task_id}/comments`,
          { page: parsed.page, per_page: parsed.perPage },
        );
        const paged = buildPaginated(comments ?? [], parsed.page, parsed.perPage, undefined);
        const md = [
          `# Comments on task ${parsed.task_id}`,
          ``,
          ...paged.items.map((c) => `- ${summariseComment(c)}`),
        ].join("\n");
        return renderResponse(parsed.response_format, md, paged as unknown as Record<string, unknown>);
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_list_comments"));
      }
    },
  );

  server.registerTool(
    "vikunja_get_comment",
    {
      title: "Get a single comment",
      description: `Fetch one comment on a task.`,
      inputSchema: GetCommentInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = GetCommentInputSchema.parse(args);
        const comment = await client.get<VikunjaTaskComment>(
          `/tasks/${parsed.task_id}/comments/${parsed.comment_id}`,
        );
        return renderResponse(
          parsed.response_format,
          summariseComment(comment),
          comment as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_get_comment"));
      }
    },
  );

  server.registerTool(
    "vikunja_create_comment",
    {
      title: "Create a comment on a task",
      description: `Add a new comment to a task.`,
      inputSchema: CreateCommentInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = CreateCommentInputSchema.parse(args);
        const body = descriptionToHtml(parsed.comment) ?? parsed.comment;
        const comment = await client.put<VikunjaTaskComment>(
          `/tasks/${parsed.task_id}/comments`,
          { comment: body },
        );
        return renderResponse(
          parsed.response_format,
          `Added comment ${comment.id} on task ${parsed.task_id}.`,
          comment as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_create_comment"));
      }
    },
  );

  server.registerTool(
    "vikunja_update_comment",
    {
      title: "Update a comment",
      description: `Edit an existing comment's body.`,
      inputSchema: UpdateCommentInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = UpdateCommentInputSchema.parse(args);
        const body = descriptionToHtml(parsed.comment) ?? parsed.comment;
        const comment = await client.post<VikunjaTaskComment>(
          `/tasks/${parsed.task_id}/comments/${parsed.comment_id}`,
          { id: parsed.comment_id, comment: body },
        );
        return renderResponse(
          parsed.response_format,
          `Updated comment ${comment.id}.`,
          comment as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_update_comment"));
      }
    },
  );

  server.registerTool(
    "vikunja_delete_comment",
    {
      title: "Delete a comment (destructive, requires opt-in)",
      description: `Delete a comment. Requires ENABLE_COMMENT_DELETE=true.`,
      inputSchema: DeleteCommentInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        if (!config.enableCommentDelete) {
          return renderError(
            "vikunja_delete_comment is disabled. Restart with ENABLE_COMMENT_DELETE=true to enable.",
          );
        }
        const parsed = DeleteCommentInputSchema.parse(args);
        await client.delete(`/tasks/${parsed.task_id}/comments/${parsed.comment_id}`);
        return renderResponse(
          ResponseFormat.MARKDOWN,
          `Deleted comment ${parsed.comment_id}.`,
          { deleted: parsed.comment_id } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_delete_comment"));
      }
    },
  );
};
