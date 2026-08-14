/** Retry helpers for transient Public API failures. */

export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_RETRY_BASE_MS = 500;
export const DEFAULT_RETRY_CAP_MS = 8_000;

export const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export function shouldRetryStatus(statusCode: number): boolean {
  return RETRYABLE_STATUS_CODES.has(statusCode);
}

/** Parse Retry-After as delay-seconds or HTTP-date → seconds from now. */
export function parseRetryAfterSeconds(value: string | undefined): number | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;

  const asNumber = Number(text);
  if (Number.isFinite(asNumber)) {
    return Math.max(0, asNumber);
  }

  const when = Date.parse(text);
  if (!Number.isFinite(when)) return undefined;
  return Math.max(0, (when - Date.now()) / 1000);
}

export function retryDelayMs(attempt: number, retryAfterHeader?: string): number {
  const parsed = parseRetryAfterSeconds(retryAfterHeader);
  if (parsed != null) {
    return Math.min(parsed * 1000, DEFAULT_RETRY_CAP_MS);
  }
  const ceiling = Math.min(
    DEFAULT_RETRY_CAP_MS,
    DEFAULT_RETRY_BASE_MS * 2 ** attempt,
  );
  return Math.random() * ceiling;
}

/** Overridable in tests. */
export let sleepFn: (ms: number) => Promise<void> = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function setSleepFn(fn: (ms: number) => Promise<void>): void {
  sleepFn = fn;
}
