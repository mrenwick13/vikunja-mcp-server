import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { Agent } from "node:https";
import { REQUEST_TIMEOUT_MS, SERVER_NAME, SERVER_VERSION } from "../constants.js";
import type { ServerConfig } from "./config.js";

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
