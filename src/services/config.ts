import { ENV } from "../constants.js";

export interface ServerConfig {
  apiUrl: string;
  apiToken: string;
  verifySsl: boolean;
  enableTaskDelete: boolean;
  enableProjectDelete: boolean;
  enableLabelDelete: boolean;
  enableFilterDelete: boolean;
  enableCommentDelete: boolean;
  enableBucketDelete: boolean;
  enableViewDelete: boolean;
}

function readBoolean(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return raw.toLowerCase() === "true" || raw === "1";
}

function requireString(name: string): string {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") {
    console.error(`ERROR: ${name} environment variable is required`);
    process.exit(1);
  }
  return raw.trim();
}

function normaliseApiUrl(raw: string): string {
  let url = raw.replace(/\/+$/, "");
  if (!/\/api\/v\d+$/.test(url)) {
    console.error(
      `ERROR: ${ENV.url} must end with an API version segment such as /api/v1. ` +
        `Got: ${raw}`,
    );
    process.exit(1);
  }
  return url;
}

export function loadConfig(): ServerConfig {
  return {
    apiUrl: normaliseApiUrl(requireString(ENV.url)),
    apiToken: requireString(ENV.token),
    verifySsl: readBoolean(ENV.verifySsl, true),
    enableTaskDelete: readBoolean(ENV.enableTaskDelete, false),
    enableProjectDelete: readBoolean(ENV.enableProjectDelete, false),
    enableLabelDelete: readBoolean(ENV.enableLabelDelete, false),
    enableFilterDelete: readBoolean(ENV.enableFilterDelete, false),
    enableCommentDelete: readBoolean(ENV.enableCommentDelete, false),
    enableBucketDelete: readBoolean(ENV.enableBucketDelete, false),
    enableViewDelete: readBoolean(ENV.enableViewDelete, false),
  };
}
