/** Server-only admin authentication configuration. */

export const ADMIN_SESSION_COOKIE = "kk_admin_session";

/** JWT issuer claim — must match on verify. */
export const ADMIN_JWT_ISSUER = "ki-khobor-admin";

/** JWT audience claim — must match on verify. */
export const ADMIN_JWT_AUDIENCE = "ki-khobor-admin-session";

/** Default session lifetime when ADMIN_SESSION_TTL is unset. */
export const DEFAULT_ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

export class AdminAuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAuthConfigError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new AdminAuthConfigError(`Missing ${name} environment variable.`);
  }
  return value;
}

/**
 * Parse ADMIN_SESSION_TTL.
 * Accepts seconds as a positive integer string, or shorthand like "8h" / "480m".
 */
export function parseAdminSessionTtlSeconds(
  raw: string | undefined
): number {
  const value = raw?.trim();
  if (!value) return DEFAULT_ADMIN_SESSION_TTL_SECONDS;

  const hours = /^(\d+)\s*h$/i.exec(value);
  if (hours) {
    const n = Number(hours[1]);
    if (n > 0) return n * 60 * 60;
  }

  const minutes = /^(\d+)\s*m$/i.exec(value);
  if (minutes) {
    const n = Number(minutes[1]);
    if (n > 0) return n * 60;
  }

  const seconds = /^(\d+)$/.exec(value);
  if (seconds) {
    const n = Number(seconds[1]);
    if (n > 0) return n;
  }

  throw new AdminAuthConfigError(
    "ADMIN_SESSION_TTL must be a positive duration (e.g. 28800, 8h, or 480m)."
  );
}

export type AdminAuthConfig = {
  username: string;
  passwordHash: string;
  jwtSecret: string;
  sessionTtlSeconds: number;
  /** Preferred absolute origin for CSRF checks, e.g. https://example.com */
  appOrigin: string | null;
};

export function getAdminAuthConfig(): AdminAuthConfig {
  return {
    username: requireEnv("ADMIN_USERNAME"),
    passwordHash: requireEnv("ADMIN_PASSWORD_HASH"),
    jwtSecret: requireEnv("JWT_SECRET"),
    sessionTtlSeconds: parseAdminSessionTtlSeconds(
      process.env.ADMIN_SESSION_TTL
    ),
    appOrigin: process.env.APP_ORIGIN?.trim() || null,
  };
}

/** True when all required admin auth secrets are present. */
export function isAdminAuthConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_USERNAME?.trim() &&
      process.env.ADMIN_PASSWORD_HASH?.trim() &&
      process.env.JWT_SECRET?.trim()
  );
}
