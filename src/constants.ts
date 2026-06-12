import { createRequire } from "node:module";

export const SERVER_NAME = "vikunja-mcp-server";

// Derive the version from package.json at runtime so it can never drift.
// (Compiled output lives in dist/, so ../package.json resolves to the package root
// both from src/ under tsx and from dist/ after build.)
function readPackageVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json") as { version?: string };
    if (typeof pkg.version === "string" && pkg.version.length > 0) return pkg.version;
  } catch {
    // fall through to the static fallback below
  }
  return "0.0.0";
}

export const SERVER_VERSION = readPackageVersion();

export const REQUEST_TIMEOUT_MS = 30_000;
export const CHARACTER_LIMIT = 25_000;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 50;

export const ENV = {
  url: "VIKUNJA_URL",
  token: "VIKUNJA_API_TOKEN",
  verifySsl: "VERIFY_SSL",
  enableTaskDelete: "ENABLE_TASK_DELETE",
  enableProjectDelete: "ENABLE_PROJECT_DELETE",
  enableLabelDelete: "ENABLE_LABEL_DELETE",
  enableFilterDelete: "ENABLE_FILTER_DELETE",
  enableCommentDelete: "ENABLE_COMMENT_DELETE",
  enableBucketDelete: "ENABLE_BUCKET_DELETE",
  enableViewDelete: "ENABLE_VIEW_DELETE",
} as const;
