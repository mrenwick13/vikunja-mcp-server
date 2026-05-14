# vikunja-mcp-server

Model Context Protocol server for [Vikunja](https://vikunja.io/) task management. Exposes the Vikunja REST API to MCP clients with full coverage of tasks, projects, views, buckets (Kanban columns), labels, filters, comments, assignees, relations, and subscriptions.

Built to fill gaps in the existing community MCPs (no bucket writes in democratize-technology, broken bulk endpoint in aimbitgmbh as of May 2026).

## Status

Pre-release. Personal tool, MIT-licensed, contributions welcome.

## Quick start

```bash
npm install
npm run build

export VIKUNJA_URL="https://your-vikunja.example/api/v1"
export VIKUNJA_API_TOKEN="tk_..."
npm start
```

The server speaks stdio. Wire it into a Claude Code / Claude Desktop / other MCP client as a custom stdio server.

## Environment variables

| Variable | Required | Default | Purpose |
| -------- | -------- | ------- | ------- |
| `VIKUNJA_URL` | yes | — | Base API URL including `/api/v1` suffix |
| `VIKUNJA_API_TOKEN` | yes | — | Vikunja API token (starts with `tk_`) |
| `VERIFY_SSL` | no | `true` | Set to `false` to skip TLS verification |
| `ENABLE_TASK_DELETE` | no | `false` | Allow `task_delete` |
| `ENABLE_PROJECT_DELETE` | no | `false` | Allow `project_delete` |
| `ENABLE_VIEW_DELETE` | no | `false` | Allow `view_delete` |
| `ENABLE_BUCKET_DELETE` | no | `false` | Allow `bucket_delete` |
| `ENABLE_LABEL_DELETE` | no | `false` | Allow `label_delete` |
| `ENABLE_FILTER_DELETE` | no | `false` | Allow `filter_delete` |
| `ENABLE_COMMENT_DELETE` | no | `false` | Allow `comment_delete` |

Destructive operations are disabled by default. Enable explicitly per resource if needed.

## License

MIT
