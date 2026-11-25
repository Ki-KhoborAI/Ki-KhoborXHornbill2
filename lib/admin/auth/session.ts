import { SignJWT, jwtVerify, errors as JoseErrors } from "jose";
import {
  ADMIN_JWT_AUDIENCE,
  ADMIN_JWT_ISSUER,
  ADMIN_SESSION_COOKIE,
  getAdminAuthConfig,
  type AdminAuthConfig,
} from "./config";

export type AdminSessionClaims = {
  username: string;
};

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function createAdminSessionToken(
  username: string,
  config: AdminAuthConfig = getAdminAuthConfig()
): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(username)
    .setIssuer(ADMIN_JWT_ISSUER)
    .setAudience(ADMIN_JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${config.sessionTtlSeconds}s`)
    .sign(secretKey(config.jwtSecret));
}

export async function verifyAdminSessionToken(
  token: string,
  config: AdminAuthConfig = getAdminAuthConfig()
): Promise<AdminSessionClaims | null> {
  if (!token?.trim()) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(config.jwtSecret), {
      algorithms: ["HS256"],
      issuer: ADMIN_JWT_ISSUER,
      audience: ADMIN_JWT_AUDIENCE,
    });

    const username =
      typeof payload.sub === "string" ? payload.sub.trim() : "";
    if (!username) return null;

    return { username };
  } catch (error) {
    if (
      error instanceof JoseErrors.JWTExpired ||
      error instanceof JoseErrors.JWTInvalid ||
      error instanceof JoseErrors.JWSSignatureVerificationFailed ||
      error instanceof JoseErrors.JWTClaimValidationFailed
    ) {
      return null;
    }
    return null;
  }
}

export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  maxAge: number;
};

export function buildSessionCookieOptions(
  config: AdminAuthConfig = getAdminAuthConfig()
): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: config.sessionTtlSeconds,
  };
}

/** Serialize Set-Cookie for the admin session JWT. */
export function serializeAdminSessionCookie(
  token: string,
  config: AdminAuthConfig = getAdminAuthConfig()
): string {
  const options = buildSessionCookieOptions(config);
  const parts = [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${options.maxAge}`,
  ];
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

/** Clear the admin session cookie. */
export function serializeClearedAdminSessionCookie(): string {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function readAdminSessionCookie(
  cookieHeader: string | null
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === ADMIN_SESSION_COOKIE) {
      const value = rest.join("=").trim();
      if (!value) return null;
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}
