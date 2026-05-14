import { z } from "zod";
import { handleApiError } from "../services/errors.js";
import { renderError, renderResponse } from "../services/format.js";
import type { ToolRegistrar } from "../services/registry.js";
import { ResponseFormatSchema, ResponseFormat } from "../schemas/common.js";

interface VikunjaInfo {
  version: string;
  frontend_url: string;
  motd: string;
  link_sharing_enabled: boolean;
  max_file_size: string;
  max_items_per_page: number;
  available_migrators: string[];
  task_attachments_enabled: boolean;
  enabled_background_providers: string[];
  totp_enabled: boolean;
  caldav_enabled: boolean;
  auth: Record<string, unknown>;
  legal: Record<string, unknown>;
}

const GetInfoInputSchema = z
  .object({
    response_format: ResponseFormatSchema,
  })
  .strict();

export const registerInfoTools: ToolRegistrar = (server, { client }) => {
  server.registerTool(
    "vikunja_get_info",
    {
      title: "Get Vikunja instance info",
      description: `Return the connected Vikunja instance's version, configuration flags, and auth providers. Useful for confirming the server is reachable and capabilities are as expected.

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  JSON shape:
  {
    "version": string,            // e.g. "v1.1.0"
    "frontend_url": string,
    "max_items_per_page": number, // hard cap on per-page list size
    "task_attachments_enabled": boolean,
    "caldav_enabled": boolean,
    "totp_enabled": boolean,
    "available_migrators": string[],
    "enabled_background_providers": string[],
    "link_sharing_enabled": boolean,
    "auth": object                // available auth providers
  }`,
      inputSchema: GetInfoInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const parsed = GetInfoInputSchema.parse(args);
        const info = await client.get<VikunjaInfo>("/info");
        const md = [
          `# Vikunja instance info`,
          ``,
          `- **Version**: ${info.version}`,
          `- **Frontend URL**: ${info.frontend_url}`,
          `- **Max items per page**: ${info.max_items_per_page}`,
          `- **Task attachments enabled**: ${info.task_attachments_enabled}`,
          `- **CalDAV enabled**: ${info.caldav_enabled}`,
          `- **Link sharing enabled**: ${info.link_sharing_enabled}`,
          `- **Available migrators**: ${info.available_migrators.join(", ") || "(none)"}`,
        ].join("\n");
        return renderResponse(
          parsed.response_format ?? ResponseFormat.MARKDOWN,
          md,
          info as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return renderError(handleApiError(error, "vikunja_get_info"));
      }
    },
  );
};
