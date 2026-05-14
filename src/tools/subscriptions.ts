import { handleApiError } from "../services/errors.js";
import { renderError, renderResponse } from "../services/format.js";
import type { ToolRegistrar } from "../services/registry.js";
import { ResponseFormat } from "../schemas/common.js";
import {
  SubscribeInputSchema,
  UnsubscribeInputSchema,
} from "../schemas/subscription.js";
import type { VikunjaSubscription } from "../types.js";

export const registerSubscriptionTools: ToolRegistrar = (server, { client }) => {
  server.registerTool(
    "vikunja_subscribe",
    {
      title: "Subscribe the current user to a task or project",
      description: `Subscribe to notifications for changes on a task or project. entity must be 'project' or 'task'.`,
      inputSchema: SubscribeInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = SubscribeInputSchema.parse(args);
        const sub = await client.put<VikunjaSubscription>(
          `/subscriptions/${parsed.entity}/${parsed.entity_id}`,
        );
        return renderResponse(
          parsed.response_format,
          `Subscribed to ${parsed.entity} ${parsed.entity_id}.`,
          sub as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_subscribe"));
      }
    },
  );

  server.registerTool(
    "vikunja_unsubscribe",
    {
      title: "Unsubscribe the current user from a task or project",
      description: `Cancel an existing subscription on a task or project.`,
      inputSchema: UnsubscribeInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = UnsubscribeInputSchema.parse(args);
        await client.delete(`/subscriptions/${parsed.entity}/${parsed.entity_id}`);
        return renderResponse(
          ResponseFormat.MARKDOWN,
          `Unsubscribed from ${parsed.entity} ${parsed.entity_id}.`,
          parsed as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_unsubscribe"));
      }
    },
  );
};
