#!/usr/bin/env node
/**
 * Vikunja MCP server.
 *
 * Exposes Vikunja task-management operations to MCP clients over stdio.
 * Reads VIKUNJA_URL (must include /api/v1 suffix) and VIKUNJA_API_TOKEN
 * from the environment; destructive operations are gated by per-resource
 * ENABLE_* environment flags.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { VikunjaClient } from "./services/api.js";
import { loadConfig } from "./services/config.js";
import type { ToolContext } from "./services/registry.js";
import { registerInfoTools } from "./tools/info.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerViewTools } from "./tools/views.js";
import { registerBucketTools } from "./tools/buckets.js";
import { registerLabelTools } from "./tools/labels.js";
import { registerFilterTools } from "./tools/filters.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerAssigneeTools } from "./tools/assignees.js";
import { registerRelationTools } from "./tools/relations.js";
import { registerSubscriptionTools } from "./tools/subscriptions.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new VikunjaClient(config);
  const ctx: ToolContext = { client, config };

  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerInfoTools(server, ctx);
  registerTaskTools(server, ctx);
  registerProjectTools(server, ctx);
  registerViewTools(server, ctx);
  registerBucketTools(server, ctx);
  registerLabelTools(server, ctx);
  registerFilterTools(server, ctx);
  registerCommentTools(server, ctx);
  registerAssigneeTools(server, ctx);
  registerRelationTools(server, ctx);
  registerSubscriptionTools(server, ctx);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} ${SERVER_VERSION} running on stdio (api=${client.baseUrl})`);
}

main().catch((error) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});
