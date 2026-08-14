export class PraxicraftError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "PraxicraftError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class APIError extends PraxicraftError {
  constructor(message: string, code?: string) {
    super(message, code);
    this.name = "APIError";
  }
}

export class APIConnectionError extends APIError {
  constructor(message = "Failed to connect to the Praxicraft API.") {
    super(message, "CONNECTION_ERROR");
    this.name = "APIConnectionError";
  }
}

export type APIStatusErrorInit = {
  statusCode: number;
  code?: string;
  details?: unknown;
  responseBody?: unknown;
  headers?: Record<string, string>;
  requiredPlan?: string;
};

export class APIStatusError extends APIError {
  readonly statusCode: number;
  readonly details?: unknown;
  readonly responseBody?: unknown;
  readonly headers: Record<string, string>;
  readonly requiredPlan?: string;

  constructor(message: string, init: APIStatusErrorInit) {
    super(message, init.code);
    this.name = "APIStatusError";
    this.statusCode = init.statusCode;
    this.details = init.details;
    this.responseBody = init.responseBody;
    this.headers = init.headers ?? {};
    this.requiredPlan = init.requiredPlan;
  }
}

export class AuthenticationError extends APIStatusError {
  constructor(message: string, init: APIStatusErrorInit) {
    super(message, init);
    this.name = "AuthenticationError";
  }
}

export class InsufficientScopeError extends APIStatusError {
  constructor(message: string, init: APIStatusErrorInit) {
    super(message, init);
    this.name = "InsufficientScopeError";
  }
}

export class NotFoundError extends APIStatusError {
  constructor(message: string, init: APIStatusErrorInit) {
    super(message, init);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends APIStatusError {
  constructor(message: string, init: APIStatusErrorInit) {
    super(message, init);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends APIStatusError {
  readonly retryAfter?: number;

  constructor(message: string, init: APIStatusErrorInit & { retryAfter?: number }) {
    super(message, init);
    this.name = "RateLimitError";
    this.retryAfter = init.retryAfter;
  }
}

export function raiseForStatus(args: {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
}): never {
  const { statusCode, body, headers } = args;
  let error: Record<string, unknown> = {};
  if (body && typeof body === "object" && !Array.isArray(body) && "error" in body) {
    const maybe = (body as { error?: unknown }).error;
    if (maybe && typeof maybe === "object" && !Array.isArray(maybe)) {
      error = maybe as Record<string, unknown>;
    }
  }

  const code = typeof error.code === "string" ? error.code : undefined;
  let message = typeof error.message === "string" ? error.message : undefined;
  const details = error.details;
  const requiredPlan =
    typeof error.required_plan === "string" ? error.required_plan : undefined;

  if (!message) {
    if (typeof body === "string" && body.trim()) {
      message = body.trim().slice(0, 500);
    } else {
      message = `API request failed with status ${statusCode}.`;
    }
  }

  const common: APIStatusErrorInit = {
    statusCode,
    code,
    details,
    responseBody: body,
    headers,
    requiredPlan,
  };

  if (statusCode === 401) throw new AuthenticationError(message, common);
  if (statusCode === 403) throw new InsufficientScopeError(message, common);
  if (statusCode === 404) throw new NotFoundError(message, common);
  if (statusCode === 429) {
    throw new RateLimitError(message, {
      ...common,
      retryAfter: parseRetryAfter(headers["retry-after"]),
    });
  }
  if (statusCode >= 400 && statusCode < 500) {
    throw new ValidationError(message, common);
  }
  throw new APIStatusError(message, common);
}

function parseRetryAfter(value: string | undefined): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
