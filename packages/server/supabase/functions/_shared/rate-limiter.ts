// SECURITY: Simple in-memory rate limiter for Edge Functions

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  read: { maxRequests: 60, windowMs: 60_000 } satisfies RateLimitConfig,
  write: { maxRequests: 10, windowMs: 60_000 } satisfies RateLimitConfig,
  sync: { maxRequests: 1, windowMs: 300_000 } satisfies RateLimitConfig,
};

export function checkRateLimit(
  userId: string,
  action: keyof typeof RATE_LIMITS,
): { allowed: boolean; retryAfterMs?: number } {
  const config = RATE_LIMITS[action];
  const key = `${userId}:${action}`;
  const now = Date.now();

  const entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true };
}
