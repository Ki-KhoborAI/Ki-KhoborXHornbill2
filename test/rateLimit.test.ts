import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { POST as askPost } from "../app/api/ask/route";
import { POST as assistantPost } from "../app/api/assistant/route";
import {
  AI_RATE_LIMIT_PREFIX,
  AI_RATE_LIMIT_REQUESTS,
  enforceAiRateLimit,
  getTrustedClientIp,
  isRateLimitConfigured,
  resetAiRateLimiterForTests,
  setAiRateLimiterForTests,
} from "../lib/rateLimit";

function jsonRequest(
  url: string,
  body: unknown,
  ip = "203.0.113.10"
): Request {
  const payload = JSON.stringify(body);
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(payload, "utf8")),
      "x-vercel-forwarded-for": ip,
    },
    body: payload,
  });
}

afterEach(() => {
  resetAiRateLimiterForTests();
});

describe("Shared AI rate limiting", () => {
  it("exposes a single shared policy of 10 requests per minute", () => {
    assert.equal(AI_RATE_LIMIT_REQUESTS, 10);
    assert.equal(AI_RATE_LIMIT_PREFIX, "ki-khobor:ai");
  });

  it("prefers Vercel platform forwarding headers for client IP", () => {
    const request = new Request("http://localhost/api/ask", {
      headers: {
        "x-vercel-forwarded-for": "198.51.100.20, 10.0.0.1",
        "x-forwarded-for": "203.0.113.99",
        "x-real-ip": "192.0.2.55",
      },
    });
    assert.equal(getTrustedClientIp(request), "198.51.100.20");
  });

  it("falls back safely when IP headers are missing", () => {
    const request = new Request("http://localhost/api/ask");
    assert.equal(getTrustedClientIp(request), "unknown");
  });

  it("allows a request below the limit", async () => {
    setAiRateLimiterForTests(async () => ({
      success: true,
      remaining: 9,
      reset: Date.now() + 60_000,
    }));

    const blocked = await enforceAiRateLimit(
      jsonRequest("http://localhost/api/ask", { question: "hello" })
    );
    assert.equal(blocked, null);
  });

  it("returns 429 with Retry-After when the limit is exceeded", async () => {
    const reset = Date.now() + 45_000;
    setAiRateLimiterForTests(async () => ({
      success: false,
      remaining: 0,
      reset,
    }));

    const response = await enforceAiRateLimit(
      jsonRequest("http://localhost/api/ask", { question: "hello" })
    );
    assert.ok(response);
    assert.equal(response!.status, 429);
    const retryAfter = Number(response!.headers.get("Retry-After"));
    assert.ok(Number.isFinite(retryAfter) && retryAfter > 0);
    const body = (await response!.json()) as Record<string, unknown>;
    assert.equal(typeof body.error, "string");
    assert.equal("details" in body, false);
    assert.doesNotMatch(String(body.error), /redis|upstash|203\.0\.113/i);
  });

  it("shares one counter across /api/ask and /api/assistant for the same IP", async () => {
    const seen: string[] = [];
    setAiRateLimiterForTests(async (identifier) => {
      seen.push(identifier);
      return {
        success: true,
        remaining: 5,
        reset: Date.now() + 60_000,
      };
    });

    const askBlocked = await enforceAiRateLimit(
      jsonRequest("http://localhost/api/ask", { question: "hello" }, "198.51.100.7")
    );
    const assistantBlocked = await enforceAiRateLimit(
      jsonRequest(
        "http://localhost/api/assistant",
        { question: "hello" },
        "198.51.100.7"
      )
    );

    assert.equal(askBlocked, null);
    assert.equal(assistantBlocked, null);
    assert.deepEqual(seen, ["ip:198.51.100.7", "ip:198.51.100.7"]);
  });

  it("keeps independent limits for different client IPs", async () => {
    const seen: string[] = [];
    setAiRateLimiterForTests(async (identifier) => {
      seen.push(identifier);
      return {
        success: true,
        remaining: 5,
        reset: Date.now() + 60_000,
      };
    });

    await enforceAiRateLimit(
      jsonRequest("http://localhost/api/ask", { question: "hello" }, "198.51.100.1")
    );
    await enforceAiRateLimit(
      jsonRequest("http://localhost/api/ask", { question: "hello" }, "198.51.100.2")
    );

    assert.deepEqual(seen, ["ip:198.51.100.1", "ip:198.51.100.2"]);
  });

  it("returns controlled 503 when the Redis limiter fails", async () => {
    setAiRateLimiterForTests(async () => {
      throw new Error("simulated redis outage");
    });

    const response = await enforceAiRateLimit(
      jsonRequest("http://localhost/api/ask", { question: "hello" })
    );
    assert.ok(response);
    assert.equal(response!.status, 503);
    const body = (await response!.json()) as Record<string, unknown>;
    assert.equal(typeof body.error, "string");
    assert.equal("details" in body, false);
    assert.doesNotMatch(String(body.error), /redis|upstash|simulated/i);
  });

  it("returns controlled 503 when Redis is not configured (no mock)", async () => {
    resetAiRateLimiterForTests();
    const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
    const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    try {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      assert.equal(isRateLimitConfigured(), false);

      const response = await enforceAiRateLimit(
        jsonRequest("http://localhost/api/ask", { question: "hello" })
      );
      assert.ok(response);
      assert.equal(response!.status, 503);
    } finally {
      if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
      if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
    }
  });

  it("loads without crashing when Redis credentials are absent", async () => {
    const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
    const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    try {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      resetAiRateLimiterForTests();
      const mod = await import("../lib/rateLimit");
      assert.equal(typeof mod.enforceAiRateLimit, "function");
      assert.equal(mod.isRateLimitConfigured(), false);
    } finally {
      if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
      if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
      resetAiRateLimiterForTests();
    }
  });

  it("rate-limits ask route before orchestration when over quota", async () => {
    let limitCalls = 0;
    setAiRateLimiterForTests(async () => {
      limitCalls += 1;
      return {
        success: false,
        remaining: 0,
        reset: Date.now() + 30_000,
      };
    });

    const response = await askPost(
      jsonRequest("http://localhost/api/ask", { question: "hello" })
    );
    assert.equal(response.status, 429);
    assert.equal(limitCalls, 1);
    assert.ok(response.headers.get("Retry-After"));
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal("dataSourceUsed" in body, false);
    assert.equal("details" in body, false);
  });

  it("rate-limits assistant route and shares the same identifier with ask", async () => {
    const seen: string[] = [];
    setAiRateLimiterForTests(async (identifier) => {
      seen.push(identifier);
      return {
        success: false,
        remaining: 0,
        reset: Date.now() + 30_000,
      };
    });

    const askResponse = await askPost(
      jsonRequest("http://localhost/api/ask", { question: "hello" }, "203.0.113.50")
    );
    const assistantResponse = await assistantPost(
      jsonRequest(
        "http://localhost/api/assistant",
        { question: "hello again" },
        "203.0.113.50"
      )
    );

    assert.equal(askResponse.status, 429);
    assert.equal(assistantResponse.status, 429);
    assert.deepEqual(seen, ["ip:203.0.113.50", "ip:203.0.113.50"]);
  });

  it("still rejects invalid ask payloads after an allowed rate-limit check", async () => {
    let limitCalls = 0;
    setAiRateLimiterForTests(async () => {
      limitCalls += 1;
      return {
        success: true,
        remaining: 8,
        reset: Date.now() + 60_000,
      };
    });

    const response = await askPost(
      jsonRequest("http://localhost/api/ask", { question: "   " })
    );
    assert.equal(limitCalls, 1);
    assert.equal(response.status, 400);
  });
});
