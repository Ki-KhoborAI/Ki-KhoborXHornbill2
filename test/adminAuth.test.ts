import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { hashSync } from "bcryptjs";
import { SignJWT } from "jose";
import { POST as loginPost } from "../app/api/admin/auth/login/route";
import { POST as logoutPost } from "../app/api/admin/auth/logout/route";
import { GET as meGet } from "../app/api/admin/auth/me/route";
import {
  ADMIN_JWT_AUDIENCE,
  ADMIN_JWT_ISSUER,
  ADMIN_SESSION_COOKIE,
  DEFAULT_ADMIN_SESSION_TTL_SECONDS,
  parseAdminSessionTtlSeconds,
} from "../lib/admin/auth/config";
import {
  isTrustedAuthOrigin,
  resolveAllowedOrigin,
} from "../lib/admin/auth/origin";
import {
  usernamesMatch,
  verifyAdminPassword,
} from "../lib/admin/auth/password";
import {
  ADMIN_LOGIN_RATE_LIMIT_PREFIX,
  ADMIN_LOGIN_RATE_LIMIT_REQUESTS,
  enforceAdminLoginRateLimit,
  resetAdminLoginRateLimiterForTests,
  setAdminLoginRateLimiterForTests,
} from "../lib/admin/auth/rateLimit";
import {
  createAdminSessionToken,
  readAdminSessionCookie,
  serializeAdminSessionCookie,
  serializeClearedAdminSessionCookie,
  verifyAdminSessionToken,
} from "../lib/admin/auth/session";
import {
  isAdminSessionResponse,
  requireAdminSession,
} from "../lib/admin/auth/guard";
import { getTrustedClientIp } from "../lib/rateLimit";

const TEST_PASSWORD = "test-admin-password";
const TEST_PASSWORD_HASH = hashSync(TEST_PASSWORD, 10);
const TEST_USERNAME = "admin-tester";
const TEST_JWT_SECRET = "unit-test-jwt-secret-at-least-32-chars";
const TEST_ORIGIN = "http://localhost:3000";

const savedEnv: Record<string, string | undefined> = {};
const AUTH_ENV_KEYS = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD_HASH",
  "JWT_SECRET",
  "ADMIN_SESSION_TTL",
  "APP_ORIGIN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "NODE_ENV",
] as const;

function setProcessEnv(key: string, value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) {
    delete env[key];
  } else {
    env[key] = value;
  }
}

function snapshotEnv(): void {
  for (const key of AUTH_ENV_KEYS) {
    savedEnv[key] = process.env[key];
  }
}

function restoreEnv(): void {
  for (const key of AUTH_ENV_KEYS) {
    setProcessEnv(key, savedEnv[key]);
  }
}

function configureAuthEnv(overrides: Record<string, string> = {}): void {
  process.env.ADMIN_USERNAME = TEST_USERNAME;
  process.env.ADMIN_PASSWORD_HASH = TEST_PASSWORD_HASH;
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.ADMIN_SESSION_TTL = "8h";
  process.env.APP_ORIGIN = TEST_ORIGIN;
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  Object.assign(process.env, overrides);
}

function authConfig() {
  return {
    username: TEST_USERNAME,
    passwordHash: TEST_PASSWORD_HASH,
    jwtSecret: TEST_JWT_SECRET,
    sessionTtlSeconds: DEFAULT_ADMIN_SESSION_TTL_SECONDS,
    appOrigin: TEST_ORIGIN,
  };
}

function loginRequest(
  body: unknown,
  init?: { origin?: string; ip?: string; omitOrigin?: boolean }
): Request {
  const payload = JSON.stringify(body);
  const headers = new Headers({
    "content-type": "application/json",
    "content-length": String(Buffer.byteLength(payload, "utf8")),
  });
  if (!init?.omitOrigin) {
    headers.set("origin", init?.origin ?? TEST_ORIGIN);
  }
  if (init?.ip) {
    headers.set("x-vercel-forwarded-for", init.ip);
  }
  return new Request(`${TEST_ORIGIN}/api/admin/auth/login`, {
    method: "POST",
    headers,
    body: payload,
  });
}

beforeEach(() => {
  snapshotEnv();
  configureAuthEnv();
  setAdminLoginRateLimiterForTests(async () => ({
    success: true,
    remaining: 4,
    reset: Date.now() + 15 * 60_000,
  }));
});

afterEach(() => {
  resetAdminLoginRateLimiterForTests();
  restoreEnv();
});

describe("Admin auth — configuration", () => {
  it("defaults session TTL to 8 hours", () => {
    assert.equal(DEFAULT_ADMIN_SESSION_TTL_SECONDS, 8 * 60 * 60);
    assert.equal(parseAdminSessionTtlSeconds(undefined), 8 * 60 * 60);
    assert.equal(parseAdminSessionTtlSeconds("8h"), 8 * 60 * 60);
    assert.equal(parseAdminSessionTtlSeconds("480m"), 8 * 60 * 60);
    assert.equal(parseAdminSessionTtlSeconds("28800"), 28800);
  });

  it("rejects invalid ADMIN_SESSION_TTL values", () => {
    assert.throws(() => parseAdminSessionTtlSeconds("0"), /ADMIN_SESSION_TTL/);
    assert.throws(() => parseAdminSessionTtlSeconds("abc"), /ADMIN_SESSION_TTL/);
  });
});

describe("Admin auth — password helpers", () => {
  it("verifies bcrypt password hashes without exposing the hash", async () => {
    assert.equal(await verifyAdminPassword(TEST_PASSWORD, TEST_PASSWORD_HASH), true);
    assert.equal(await verifyAdminPassword("wrong", TEST_PASSWORD_HASH), false);
    assert.equal(await verifyAdminPassword("", TEST_PASSWORD_HASH), false);
  });

  it("compares usernames in a length-safe way", () => {
    assert.equal(usernamesMatch("admin", "admin"), true);
    assert.equal(usernamesMatch("admin", "Admin"), false);
    assert.equal(usernamesMatch("admin", "admi"), false);
  });
});

describe("Admin auth — JWT sessions", () => {
  it("creates HS256 tokens with issuer, audience, and expiration", async () => {
    const token = await createAdminSessionToken(TEST_USERNAME, authConfig());
    const session = await verifyAdminSessionToken(token, authConfig());
    assert.deepEqual(session, { username: TEST_USERNAME });
  });

  it("rejects tokens with wrong issuer or audience", async () => {
    const secret = new TextEncoder().encode(TEST_JWT_SECRET);
    const wrongIssuer = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(TEST_USERNAME)
      .setIssuer("other-issuer")
      .setAudience(ADMIN_JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(secret);

    const wrongAudience = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(TEST_USERNAME)
      .setIssuer(ADMIN_JWT_ISSUER)
      .setAudience("other-audience")
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(secret);

    assert.equal(await verifyAdminSessionToken(wrongIssuer, authConfig()), null);
    assert.equal(await verifyAdminSessionToken(wrongAudience, authConfig()), null);
  });

  it("rejects expired tokens", async () => {
    const secret = new TextEncoder().encode(TEST_JWT_SECRET);
    const expired = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(TEST_USERNAME)
      .setIssuer(ADMIN_JWT_ISSUER)
      .setAudience(ADMIN_JWT_AUDIENCE)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);

    assert.equal(await verifyAdminSessionToken(expired, authConfig()), null);
  });

  it("serializes HTTP-only SameSite=Lax cookies with Path=/ and Secure in production", () => {
    const previous = process.env.NODE_ENV;
    setProcessEnv("NODE_ENV", "production");
    try {
      const cookie = serializeAdminSessionCookie("token.value", authConfig());
      assert.match(cookie, new RegExp(`^${ADMIN_SESSION_COOKIE}=`));
      assert.match(cookie, /HttpOnly/);
      assert.match(cookie, /SameSite=Lax/);
      assert.match(cookie, /Path=\//);
      assert.match(cookie, /Secure/);
      assert.match(cookie, /Max-Age=28800/);
    } finally {
      setProcessEnv("NODE_ENV", previous);
    }
  });

  it("clears the session cookie and reads cookie values from headers", () => {
    const cleared = serializeClearedAdminSessionCookie();
    assert.match(cleared, new RegExp(`^${ADMIN_SESSION_COOKIE}=;`));
    assert.match(cleared, /Max-Age=0/);

    const header = `${ADMIN_SESSION_COOKIE}=abc.def.ghi; other=1`;
    assert.equal(readAdminSessionCookie(header), "abc.def.ghi");
    assert.equal(readAdminSessionCookie(null), null);
  });
});

describe("Admin auth — origin validation", () => {
  it("prefers configured APP_ORIGIN and ignores X-Forwarded-Host", () => {
    const req = new Request("http://internal.local/api/admin/auth/login", {
      headers: {
        origin: "https://evil.example",
        "x-forwarded-host": "evil.example",
        host: "evil.example",
      },
    });

    assert.equal(resolveAllowedOrigin(req, "https://app.example"), "https://app.example");
    assert.equal(isTrustedAuthOrigin(req, "https://app.example"), false);

    const trusted = new Request("https://app.example/api/admin/auth/login", {
      headers: { origin: "https://app.example" },
    });
    assert.equal(isTrustedAuthOrigin(trusted, "https://app.example"), true);
  });

  it("fails closed in production when APP_ORIGIN is missing", () => {
    const previous = process.env.NODE_ENV;
    setProcessEnv("NODE_ENV", "production");
    try {
      const req = new Request("https://app.example/api/admin/auth/login", {
        headers: { origin: "https://app.example" },
      });
      assert.equal(resolveAllowedOrigin(req, null), null);
      assert.equal(isTrustedAuthOrigin(req, null), false);
    } finally {
      setProcessEnv("NODE_ENV", previous);
    }
  });
});

describe("Admin auth — login rate limiting", () => {
  it("uses a dedicated Upstash prefix and 5 attempts per 15 minutes", () => {
    assert.equal(ADMIN_LOGIN_RATE_LIMIT_PREFIX, "ki-khobor:admin-login");
    assert.equal(ADMIN_LOGIN_RATE_LIMIT_REQUESTS, 5);
  });

  it("reuses trusted client IP extraction", () => {
    const req = new Request("http://localhost/api/admin/auth/login", {
      headers: {
        "x-vercel-forwarded-for": "198.51.100.20, 10.0.0.1",
        "x-forwarded-for": "203.0.113.99",
      },
    });
    assert.equal(getTrustedClientIp(req), "198.51.100.20");
  });

  it("returns 429 when the login limit is exceeded", async () => {
    const reset = Date.now() + 90_000;
    setAdminLoginRateLimiterForTests(async () => ({
      success: false,
      remaining: 0,
      reset,
    }));

    const response = await enforceAdminLoginRateLimit(
      loginRequest({ username: "x", password: "y" }, { ip: "203.0.113.50" })
    );
    assert.ok(response);
    assert.equal(response!.status, 429);
    assert.ok(response!.headers.get("Retry-After"));
  });

  it("fails closed with 503 when Redis is unavailable", async () => {
    resetAdminLoginRateLimiterForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const response = await enforceAdminLoginRateLimit(
      loginRequest({ username: "x", password: "y" })
    );
    assert.ok(response);
    assert.equal(response!.status, 503);
  });

  it("fails closed with 503 when the limiter throws", async () => {
    setAdminLoginRateLimiterForTests(async () => {
      throw new Error("redis down");
    });

    const response = await enforceAdminLoginRateLimit(
      loginRequest({ username: "x", password: "y" })
    );
    assert.ok(response);
    assert.equal(response!.status, 503);
  });
});

describe("Admin auth — API routes", () => {
  it("rejects untrusted origins on login", async () => {
    const response = await loginPost(
      loginRequest(
        { username: TEST_USERNAME, password: TEST_PASSWORD },
        { origin: "https://evil.example" }
      )
    );
    assert.equal(response.status, 403);
  });

  it("rejects invalid credentials without leaking hashes or tokens", async () => {
    const response = await loginPost(
      loginRequest({ username: TEST_USERNAME, password: "wrong-password" })
    );
    assert.equal(response.status, 401);
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(body.error, "Invalid credentials.");
    assert.equal("token" in body, false);
    assert.equal("passwordHash" in body, false);
    assert.equal(response.headers.get("set-cookie"), null);
  });

  it("sets an HTTP-only session cookie on successful login", async () => {
    const response = await loginPost(
      loginRequest({ username: TEST_USERNAME, password: TEST_PASSWORD })
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as Record<string, unknown>;
    assert.deepEqual(body, { ok: true });
    assert.equal("token" in body, false);
    assert.equal("passwordHash" in body, false);

    const setCookie = response.headers.get("set-cookie");
    assert.ok(setCookie);
    assert.match(setCookie!, new RegExp(`^${ADMIN_SESSION_COOKIE}=`));
    assert.match(setCookie!, /HttpOnly/i);
    assert.match(setCookie!, /SameSite=Lax/i);
    assert.match(setCookie!, /Path=\//i);
  });

  it("requires a valid session for /api/admin/auth/me", async () => {
    const unauthorized = await meGet(
      new Request(`${TEST_ORIGIN}/api/admin/auth/me`)
    );
    assert.equal(unauthorized.status, 401);

    const token = await createAdminSessionToken(TEST_USERNAME, authConfig());
    const authorized = await meGet(
      new Request(`${TEST_ORIGIN}/api/admin/auth/me`, {
        headers: {
          cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
        },
      })
    );
    assert.equal(authorized.status, 200);
    const body = (await authorized.json()) as Record<string, unknown>;
    assert.deepEqual(body, {
      authenticated: true,
      username: TEST_USERNAME,
    });
    assert.equal("token" in body, false);
  });

  it("clears the session cookie on logout when origin is trusted", async () => {
    const response = await logoutPost(
      new Request(`${TEST_ORIGIN}/api/admin/auth/logout`, {
        method: "POST",
        headers: { origin: TEST_ORIGIN },
      })
    );
    assert.equal(response.status, 200);
    const setCookie = response.headers.get("set-cookie");
    assert.ok(setCookie);
    assert.match(setCookie!, /Max-Age=0/);
  });

  it("requireAdminSession blocks unauthenticated protected API access", async () => {
    const result = await requireAdminSession(
      new Request(`${TEST_ORIGIN}/api/admin/protected`)
    );
    assert.equal(isAdminSessionResponse(result), true);
    if (isAdminSessionResponse(result)) {
      assert.equal(result.status, 401);
    }
  });
});
