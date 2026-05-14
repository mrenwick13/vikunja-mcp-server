import { handleApiError } from "../services/errors.js";
import { buildPaginated, renderError, renderResponse } from "../services/format.js";
import type { ToolRegistrar } from "../services/registry.js";
import {
  ListNotificationsInputSchema,
  MarkNotificationInputSchema,
} from "../schemas/notification.js";
import type { VikunjaNotification } from "../types.js";

function summariseNotification(n: VikunjaNotification): string {
  const read = n.read ? "✓" : "•";
  const kind = n.name ? `[${n.name}] ` : "";
  const when = n.created ? ` (${n.created})` : "";
  return `${read} #${n.id} ${kind}${JSON.stringify(n.notification ?? {}).slice(0, 120)}${when}`;
}

export const registerNotificationTools: ToolRegistrar = (server, { client }) => {
  server.registerTool(
    "vikunja_list_notifications",
    {
      title: "List notifications for the current user",
      description: `List notifications for the authenticated user, newest first, paginated.

Each notification has an id, a kind ('name' field, e.g. 'task.assigned'), an entity-specific payload object, and a read flag. Useful for "what's changed since I last looked".`,
      inputSchema: ListNotificationsInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = ListNotificationsInputSchema.parse(args);
        const notifications = await client.get<VikunjaNotification[]>("/notifications", {
          page: parsed.page,
          per_page: parsed.perPage,
        });
        const paged = buildPaginated(notifications ?? [], parsed.page, parsed.perPage, undefined);
        const md = [
          `# Notifications`,
          ``,
          `${paged.count} on this page (page ${paged.page})${paged.has_more ? ", more available" : ""}`,
          ``,
          ...paged.items.map((n) => `- ${summariseNotification(n)}`),
        ].join("\n");
        return renderResponse(parsed.response_format, md, paged as unknown as Record<string, unknown>);
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_list_notifications"));
      }
    },
  );

  server.registerTool(
    "vikunja_mark_notification",
    {
      title: "Mark a notification as read or unread",
      description: `Mark a single notification as read (default) or unread.`,
      inputSchema: MarkNotificationInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args) => {
      try {
        const parsed = MarkNotificationInputSchema.parse(args);
        const result = await client.post<VikunjaNotification>(`/notifications/${parsed.id}`, {
          read: parsed.read,
        });
        return renderResponse(
          parsed.response_format,
          `Notification ${parsed.id} marked ${parsed.read ? "read" : "unread"}.`,
          result as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_mark_notification"));
      }
    },
  );
};
