export {
  ADMIN_SESSION_COOKIE,
  ADMIN_JWT_ISSUER,
  ADMIN_JWT_AUDIENCE,
  DEFAULT_ADMIN_SESSION_TTL_SECONDS,
  AdminAuthConfigError,
  getAdminAuthConfig,
  isAdminAuthConfigured,
  parseAdminSessionTtlSeconds,
} from "./config";
export { verifyAdminPassword, usernamesMatch } from "./password";
export {
  createAdminSessionToken,
  verifyAdminSessionToken,
  buildSessionCookieOptions,
  serializeAdminSessionCookie,
  serializeClearedAdminSessionCookie,
  readAdminSessionCookie,
} from "./session";
export {
  isTrustedAuthOrigin,
  resolveAllowedOrigin,
  getRequestOrigin,
} from "./origin";
export {
  enforceAdminLoginRateLimit,
  setAdminLoginRateLimiterForTests,
  resetAdminLoginRateLimiterForTests,
  ADMIN_LOGIN_RATE_LIMIT_PREFIX,
  ADMIN_LOGIN_RATE_LIMIT_REQUESTS,
} from "./rateLimit";
export {
  requireAdminSession,
  requireAdminMutation,
  isAdminSessionResponse,
  getAdminSessionFromCookieHeader,
} from "./guard";
