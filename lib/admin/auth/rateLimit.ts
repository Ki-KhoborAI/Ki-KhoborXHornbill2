import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import {
  getTrustedClientIp,
  isRateLimitConfigured,
} from "../../rateLimit";

/** Separate from AI budget — 5 login attempts / 15 minutes / IP. */
export const ADMIN_LOGIN_RATE_LIMIT_REQUESTS = 5;
export const ADMIN_LOGIN_RATE_LIMIT_WINDOW = "15 m" as const;
export const ADMIN_LOGIN_RATE_LIMIT_PREFIX = "ki-khobor:admin-login";

type LimitOutcome = {
  success: boolean;
  remaining: number;
  reset: number;
};

type LimitFn = (identifier: string) => Promise<LimitOutcome>;

let adminLoginRatelimit: Ratelimit | null = null;
let limitFnOverride: LimitFn | null = null;

function getAdminLoginRatelimit(): Ratelimit {
  if (!isRateLimitConfigured()) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN."
    );
  }

  if (!adminLoginRatelimit) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
      token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
    });

    adminLoginRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        ADMIN_LOGIN_RATE_LIMIT_REQUESTS,
        ADMIN_LOGIN_RATE_LIMIT_WINDOW
      ),
      prefix: ADMIN_LOGIN_RATE_LIMIT_PREFIX,
      analytics: false,
    });
  }

  return adminLoginRatelimit;
}

async function limitIdentifier(identifier: string): Promise<LimitOutcome> {
  if (limitFnOverride) {
    return limitFnOverride(identifier);
  }

  const result = await getAdminLoginRatelimit().limit(identifier);
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
  return NextResponse.json(
    { error: "Too many login attempts. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds(resetEpochMs)) },
    }
  );
}

function unavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: "Authentication service is temporarily unavailable." },
    { status: 503 }
  );
}

/**
 * Enforce admin login rate limit. Returns null when the attempt may proceed.
 * Fails closed with 503 when Redis is not configured or errors.
 */
export async function enforceAdminLoginRateLimit(
  req: Request
): Promise<NextResponse | null> {
  if (!isRateLimitConfigured() && !limitFnOverride) {
    console.error(
      "[AdminAuth] Upstash Redis is not configured for login rate limiting."
    );
    return unavailableResponse();
  }

  const clientIp = getTrustedClientIp(req);
  const identifier = `ip:${clientIp}`;

  try {
    const result = await limitIdentifier(identifier);
    if (!result.success) {
      return rateLimitedResponse(result.reset);
    }
    return null;
  } catch (error) {
    console.error("[AdminAuth] Login rate-limit check failed:", error);
    return unavailableResponse();
  }
}

export function setAdminLoginRateLimiterForTests(fn: LimitFn | null): void {
  limitFnOverride = fn;
}

export function resetAdminLoginRateLimiterForTests(): void {
  adminLoginRatelimit = null;
  limitFnOverride = null;
}
