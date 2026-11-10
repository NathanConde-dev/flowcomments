import { timingSafeEqual, createHash, createHmac } from 'crypto';

/** Constant-time string comparison (UTF-8 / hex-safe). */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a compare to reduce obvious short-circuit timing signal
    timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Verify Meta `X-Hub-Signature-256` against the raw request body. */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=') || !appSecret) {
    return false;
  }

  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const received = signatureHeader.slice('sha256='.length);
  return timingSafeEqualString(expected, received);
}

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

/**
 * Simple in-memory fixed-window rate limiter.
 * Returns true if the request is allowed.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') || 'unknown';
}
