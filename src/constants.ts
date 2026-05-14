export const SERVER_NAME = "vikunja-mcp-server";
export const SERVER_VERSION = "0.3.0";

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
