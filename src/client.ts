import {
  APIConnectionError,
  APIError,
  raiseForStatus,
} from "./errors.js";
import { AssessmentsResource } from "./resources/assessments.js";
import { InvitesResource } from "./resources/invites.js";
import { OrgResource } from "./resources/org.js";
import { PipelinesResource } from "./resources/pipelines.js";
import { ResultsResource } from "./resources/results.js";
import { WebhooksResource } from "./resources/webhooks.js";
import { VERSION } from "./version.js";

export const DEFAULT_BASE_URL = "https://assess.praxicraft.com";
export const DEFAULT_API_PREFIX = "/api/v1/public";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const USER_AGENT = `praxicraft-node/${VERSION}`;

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

export type RequestOptions = {
  params?: Record<string, unknown>;
  json?: unknown;
  headers?: Record<string, string>;
};

export class Client {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly apiPrefix = DEFAULT_API_PREFIX;
  readonly timeoutMs: number;
  readonly assessments: AssessmentsResource;
  readonly invites: InvitesResource;
  readonly results: ResultsResource;
  readonly org: OrgResource;
  readonly webhooks: WebhooksResource;
  readonly pipelines: PipelinesResource;

  private readonly fetchImpl: typeof fetch;

  constructor(options: ClientOptions = {}) {
    const resolvedKey = (
      options.apiKey ?? process.env.PRAXICRAFT_API_KEY ?? ""
    ).trim();
    if (!resolvedKey) {
      throw new APIError(
        "No API key provided. Pass apiKey or set PRAXICRAFT_API_KEY.",
        "MISSING_API_KEY",
      );
    }

    const resolvedBase = (
      options.baseUrl ??
      process.env.PRAXICRAFT_API_BASE_URL ??
      DEFAULT_BASE_URL
    )
      .trim()
      .replace(/\/+$/, "");
    if (!resolvedBase) {
      throw new APIError("baseUrl must be a non-empty URL.", "INVALID_BASE_URL");
    }

    this.apiKey = resolvedKey;
    this.baseUrl = resolvedBase;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);

    this.assessments = new AssessmentsResource(this);
    this.invites = new InvitesResource(this);
    this.results = new ResultsResource(this);
    this.org = new OrgResource(this);
    this.webhooks = new WebhooksResource(this);
    this.pipelines = new PipelinesResource(this);
  }

  async request(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<unknown> {
    const url = this.buildUrl(path, options.params);
    // Custom headers first; auth / UA are forced so callers cannot strip them.
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.headers ?? {}),
      Authorization: `Bearer ${this.apiKey}`,
      "User-Agent": USER_AGENT,
    };

    let body: string | undefined;
    if (options.json !== undefined) {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      body = JSON.stringify(options.json);
    }

    let response: Response;
    try {
      const init: RequestInit = {
        method: method.toUpperCase(),
        headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      };
      if (body !== undefined) {
        init.body = body;
      }
      response = await this.fetchImpl(url, init);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        err instanceof Error &&
        (err.name === "TimeoutError" || err.name === "AbortError")
      ) {
        throw new APIConnectionError(`Request timed out: ${message}`);
      }
      throw new APIConnectionError(`Transport error: ${message}`);
    }

    const headerMap: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headerMap[key.toLowerCase()] = value;
    });

    if (response.status === 204) {
      return null;
    }

    const rawText = await response.text();
    let parsed: unknown = null;
    if (rawText) {
      try {
        parsed = JSON.parse(rawText) as unknown;
      } catch {
        if (response.ok) {
          throw new APIError(
            `Invalid JSON response (HTTP ${response.status}).`,
            "INVALID_JSON",
          );
        }
        parsed = rawText;
      }
    }

    if (response.ok) {
      return parsed;
    }

    raiseForStatus({
      statusCode: response.status,
      body: parsed,
      headers: headerMap,
    });
  }

  get(path: string, options: Omit<RequestOptions, "json"> = {}) {
    return this.request("GET", path, options);
  }

  post(path: string, options: RequestOptions = {}) {
    return this.request("POST", path, options);
  }

  patch(path: string, options: RequestOptions = {}) {
    return this.request("PATCH", path, options);
  }

  put(path: string, options: RequestOptions = {}) {
    return this.request("PUT", path, options);
  }

  delete(path: string, options: RequestOptions = {}) {
    return this.request("DELETE", path, options);
  }

  private buildUrl(
    path: string,
    params?: Record<string, unknown>,
  ): string {
    let relative: string;
    if (path.startsWith("http://") || path.startsWith("https://")) {
      relative = path;
    } else {
      const normalized = path.startsWith("/") ? path : `/${path}`;
      relative = normalized.startsWith(this.apiPrefix)
        ? normalized
        : `${this.apiPrefix}${normalized}`;
      relative = `${this.baseUrl}${relative}`;
    }

    const url = new URL(relative);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        if (typeof value === "boolean") {
          url.searchParams.set(key, value ? "true" : "false");
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }
}
