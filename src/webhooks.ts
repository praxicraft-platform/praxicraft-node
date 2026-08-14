import { createHmac, timingSafeEqual } from "node:crypto";

function signBody(secret: string, body: Buffer): string {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function toBodyBuffer(body: Buffer | Uint8Array | string): Buffer | null {
  if (typeof body === "string") return Buffer.from(body, "utf8");
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  return null;
}

/**
 * Verify an `X-Praxicraft-Signature` header.
 *
 * Assess signs the raw request body with HMAC-SHA256 using the webhook
 * secret (`whsec_…`). Canonical header value is `sha256=<hex>`.
 * Legacy raw-hex signatures are also accepted.
 *
 * Pass the **raw** body (`Buffer`, `Uint8Array`, or UTF-8 string) — never a
 * re-serialized JSON object.
 */
export function verifySignature(
  secret: string,
  body: Buffer | Uint8Array | string,
  headerSig: string,
): boolean {
  if (typeof secret !== "string" || !secret) return false;
  if (typeof headerSig !== "string" || !headerSig) return false;

  const buf = toBodyBuffer(body);
  if (!buf) return false;

  const expected = signBody(secret, buf);

  try {
    if (headerSig.startsWith("sha256=")) {
      return safeEqual(headerSig, expected);
    }
    const legacy = expected.slice("sha256=".length);
    return safeEqual(headerSig, legacy) || safeEqual(headerSig, expected);
  } catch {
    return false;
  }
}
