import { handleApiError } from "../services/errors.js";
import { renderError, renderResponse } from "../services/format.js";
import { summariseBucket } from "../services/formatters.js";
import type { ToolRegistrar } from "../services/registry.js";
import { ResponseFormat } from "../schemas/common.js";
import {
  CreateBucketInputSchema,
  DeleteBucketInputSchema,
  ListBucketsInputSchema,
  UpdateBucketInputSchema,
} from "../schemas/bucket.js";
import type { VikunjaBucket } from "../types.js";

export const registerBucketTools: ToolRegistrar = (server, { client, config }) => {
  server.registerTool(
    "vikunja_list_buckets",
    {
      title: "List Kanban buckets in a view",
      description: `List the buckets (columns) of a Kanban view. The view must be of kind 'kanban'. Returns each bucket's ID, title, count, and WIP limit.

Caveat: the 'count' field returned by this endpoint can be stale right after recent task moves. For an authoritative view of which tasks are in which bucket, use vikunja_list_project_tasks with the Kanban view_id — that returns each bucket with its current tasks nested.`,
      inputSchema: ListBucketsInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = ListBucketsInputSchema.parse(args);
        const buckets = await client.get<VikunjaBucket[]>(
          `/projects/${parsed.project_id}/views/${parsed.view_id}/buckets`,
        );
        const list = buckets ?? [];
        const md = [
          `# Buckets in view ${parsed.view_id} (project ${parsed.project_id})`,
          ``,
          `${list.length} bucket(s)`,
          ``,
          ...list.map((b) => `- ${summariseBucket(b)}`),
        ].join("\n");
        return renderResponse(parsed.response_format, md, { buckets: list } as unknown as Record<string, unknown>);
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_list_buckets"));
      }
    },
  );

  server.registerTool(
    "vikunja_create_bucket",
    {
      title: "Create a Kanban bucket",
      description: `Create a new Kanban column. limit=0 means no WIP cap.`,
      inputSchema: CreateBucketInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = CreateBucketInputSchema.parse(args);
        const { project_id, view_id, response_format, ...body } = parsed;
        const bucket = await client.put<VikunjaBucket>(
          `/projects/${project_id}/views/${view_id}/buckets`,
          body,
        );
        return renderResponse(
          response_format,
          `Created bucket ${bucket.id}: ${bucket.title}`,
          bucket as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_create_bucket"));
      }
    },
  );

  server.registerTool(
    "vikunja_update_bucket",
    {
      title: "Update a Kanban bucket",
      description: `Rename a bucket, change its WIP limit, or reorder it.`,
      inputSchema: UpdateBucketInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = UpdateBucketInputSchema.parse(args);
        const body: Record<string, unknown> = { id: parsed.bucket_id };
        if (parsed.title !== undefined) body.title = parsed.title;
        if (parsed.limit !== undefined) body.limit = parsed.limit;
        if (parsed.position !== undefined) body.position = parsed.position;
        const bucket = await client.post<VikunjaBucket>(
          `/projects/${parsed.project_id}/views/${parsed.view_id}/buckets/${parsed.bucket_id}`,
          body,
        );
        return renderResponse(
          parsed.response_format,
          `Updated bucket ${bucket.id}: ${bucket.title}`,
          bucket as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_update_bucket"));
      }
    },
  );

  server.registerTool(
    "vikunja_delete_bucket",
    {
      title: "Delete a Kanban bucket (destructive, requires opt-in)",
      description: `Delete a bucket from a Kanban view. Tasks in the bucket move to the view's default bucket. Requires ENABLE_BUCKET_DELETE=true.`,
      inputSchema: DeleteBucketInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        if (!config.enableBucketDelete) {
          return renderError(
            "vikunja_delete_bucket is disabled. Restart with ENABLE_BUCKET_DELETE=true to enable.",
          );
        }
        const parsed = DeleteBucketInputSchema.parse(args);
        await client.delete(
          `/projects/${parsed.project_id}/views/${parsed.view_id}/buckets/${parsed.bucket_id}`,
        );
        return renderResponse(
          ResponseFormat.MARKDOWN,
          `Deleted bucket ${parsed.bucket_id}.`,
          { deleted: parsed.bucket_id } as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_delete_bucket"));
      }
    },
  );
};
