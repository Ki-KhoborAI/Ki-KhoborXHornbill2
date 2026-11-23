import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/** Shared AI endpoint budget: 10 requests / minute / client IP across ask + assistant. */
export const AI_RATE_LIMIT_REQUESTS = 10;
export const AI_RATE_LIMIT_WINDOW = "1 m" as const;

/** Redis key prefix shared by /api/ask and /api/assistant. */
export const AI_RATE_LIMIT_PREFIX = "ki-khobor:ai";

export class RateLimitConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitConfigError";
  }
}

type LimitOutcome = {
  success: boolean;
  remaining: number;
  reset: number;
};

type LimitFn = (identifier: string) => Promise<LimitOutcome>;

let ratelimitClient: Ratelimit | null = null;
let limitFnOverride: LimitFn | null = null;

/** True when Upstash REST credentials are present. */
export function isRateLimitConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

/**
 * Prefer platform-managed forwarding headers (Vercel), then fall back carefully.
 * Does not invent per-request uniqueness for missing IPs — unknown clients share
 * a single limited bucket rather than bypassing protection.
 */
export function getTrustedClientIp(req: Request): string {
  const vercelForwarded = req.headers.get("x-vercel-forwarded-for")?.trim();
  if (vercelForwarded) {
    const first = vercelForwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const forwardedFor = req.headers.get("x-forwarded-for")?.trim();
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function getSharedRatelimit(): Ratelimit {
  if (!isRateLimitConfigured()) {
    throw new RateLimitConfigError(
      "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN."
    );
  }

  if (!ratelimitClient) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
      token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
    });

    ratelimitClient = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        AI_RATE_LIMIT_REQUESTS,
        AI_RATE_LIMIT_WINDOW
      ),
      prefix: AI_RATE_LIMIT_PREFIX,
      analytics: false,
    });
  }

  return ratelimitClient;
}

async function limitIdentifier(identifier: string): Promise<LimitOutcome> {
  if (limitFnOverride) {
    return limitFnOverride(identifier);
  }

  const result = await getSharedRatelimit().limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

function retryAfterSeconds(resetEpochMs: number): number {
  const seconds = Math.ceil((resetEpochMs - Date.now()) / 1000);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
}

function rateLimitedResponse(resetEpochMs: number): NextResponse {
  const retryAfter = retryAfterSeconds(resetEpochMs);
  return NextResponse.json(
    {
      error:
        "The assistant is busy right now. Please try again in a minute.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    }
  );
}

function unavailableResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "The assistant is temporarily unavailable. Please try again later.",
    },
    { status: 503 }
  );
}

/**
 * Enforce the shared AI rate limit for /api/ask and /api/assistant.
 * Returns null when the request may proceed.
 */
export async function enforceAiRateLimit(
  req: Request
): Promise<NextResponse | null> {
  if (!isRateLimitConfigured() && !limitFnOverride) {
    console.error(
      "[RateLimit] Upstash Redis is not configured (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)."
    );
    return unavailableResponse();
  }

  const clientIp = getTrustedClientIp(req);
  // Shared identifier — no route suffix — so ask and assistant share one budget.
  const identifier = `ip:${clientIp}`;

  try {
    const result = await limitIdentifier(identifier);
    if (!result.success) {
      return rateLimitedResponse(result.reset);
    }
    return null;
  } catch (error) {
    console.error("[RateLimit] Redis rate-limit check failed:", error);
    return unavailableResponse();
  }
}

/** Test helper — inject a mock limiter (or clear with null). */
export function setAiRateLimiterForTests(fn: LimitFn | null): void {
  limitFnOverride = fn;
}

/** Test helper — clear cached Upstash client between cases. */
export function resetAiRateLimiterForTests(): void {
  ratelimitClient = null;
  limitFnOverride = null;
}
