import { AxiosError } from "axios";
import { ZodError } from "zod";

export function handleApiError(error: unknown, context?: string): string {
  const prefix = context ? `${context}: ` : "";

  if (error instanceof ZodError) {
    const issues = error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return `${prefix}Invalid arguments. ${issues}`;
  }

  if (error instanceof AxiosError) {
    if (error.response) {
      const { status, data } = error.response;
      const apiMessage =
        (data && typeof data === "object" && "message" in data && typeof data.message === "string"
          ? data.message
          : undefined) ??
        (typeof data === "string" ? data.slice(0, 300) : undefined);

      switch (status) {
        case 400:
          return `${prefix}Bad request (400). ${apiMessage ?? "Check arguments against the schema."}`;
        case 401:
          return `${prefix}Unauthorised (401). The API token is missing, expired, or revoked. Check VIKUNJA_API_TOKEN.`;
        case 403:
          return `${prefix}Forbidden (403). The token does not have permission for this resource. ${apiMessage ?? ""}`.trim();
        case 404:
          return `${prefix}Not found (404). The requested resource does not exist or is not accessible to this token. ${apiMessage ?? ""}`.trim();
        case 409:
          return `${prefix}Conflict (409). ${apiMessage ?? "The operation conflicts with current resource state."}`;
        case 412:
          return `${prefix}Precondition failed (412). ${apiMessage ?? "A prerequisite was not met (often a missing or wrong field)."}`;
        case 429:
          return `${prefix}Rate limited (429). Slow the rate of requests and retry.`;
        case 500:
        case 502:
        case 503:
        case 504:
          return `${prefix}Vikunja server error (${status}). ${apiMessage ?? "Try again shortly; check the Vikunja instance is healthy."}`;
        default:
          return `${prefix}API request failed with status ${status}. ${apiMessage ?? ""}`.trim();
      }
    }
    if (error.code === "ECONNABORTED") {
      return `${prefix}Request timed out. The Vikunja instance may be slow or unreachable.`;
    }
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return `${prefix}Could not reach Vikunja at the configured URL. Check VIKUNJA_URL and network connectivity.`;
    }
    return `${prefix}Network error: ${error.message}`;
  }

  if (error instanceof Error) {
    return `${prefix}${error.message}`;
  }

  return `${prefix}Unexpected error: ${String(error)}`;
}

export class DisabledToolError extends Error {
  constructor(toolName: string, envFlag: string) {
    super(
      `Tool ${toolName} is disabled by default for safety. ` +
        `Set ${envFlag}=true in the server's environment to enable it.`,
    );
    this.name = "DisabledToolError";
  }
}
