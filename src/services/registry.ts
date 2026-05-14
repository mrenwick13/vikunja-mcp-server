import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VikunjaClient } from "./api.js";
import type { ServerConfig } from "./config.js";

export interface ToolContext {
  client: VikunjaClient;
  config: ServerConfig;
}

export type ToolRegistrar = (server: McpServer, ctx: ToolContext) => void;
