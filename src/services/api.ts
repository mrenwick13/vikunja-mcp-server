import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { Agent } from "node:https";
import { REQUEST_TIMEOUT_MS, SERVER_NAME, SERVER_VERSION } from "../constants.js";
import type { ServerConfig } from "./config.js";

/** Real pagination data captured from Vikunja's response headers. */
export interface PaginationInfo {
  /** Value of x-pagination-total-pages, when present. */
  totalPages?: number;
  /** Value of x-pagination-result-count (items in this page), when present. */
  resultCount?: number;
}

export interface ListResult<T> {
  data: T;
  pagination: PaginationInfo;
}

function parseIntHeader(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export class VikunjaClient {
  private readonly axios: AxiosInstance;

  constructor(private readonly config: ServerConfig) {
    this.axios = axios.create({
      baseURL: config.apiUrl,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": `${SERVER_NAME}/${SERVER_VERSION}`,
      },
      httpsAgent: config.verifySsl
        ? undefined
        : new Agent({ rejectUnauthorized: false }),
    });
  }

  get baseUrl(): string {
    return this.config.apiUrl;
  }

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: { data?: unknown; params?: Record<string, unknown> } = {},
  ): Promise<T> {
    const requestConfig: AxiosRequestConfig = {
      method,
      url: path,
      data: options.data,
      params: options.params,
    };
    const response = await this.axios.request<T>(requestConfig);
    return response.data;
  }

  get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  /**
   * GET a list endpoint and capture Vikunja's pagination response headers
   * (x-pagination-total-pages, x-pagination-result-count) alongside the body,
   * so callers can report real totals instead of guessing from page fullness.
   */
  async getList<T>(path: string, params?: Record<string, unknown>): Promise<ListResult<T>> {
    const response = await this.axios.request<T>({ method: "GET", url: path, params });
    return {
      data: response.data,
      pagination: {
        totalPages: parseIntHeader(response.headers["x-pagination-total-pages"]),
        resultCount: parseIntHeader(response.headers["x-pagination-result-count"]),
      },
    };
  }

  post<T>(path: string, data?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("POST", path, { data, params });
  }

  put<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>("PUT", path, { data });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}
