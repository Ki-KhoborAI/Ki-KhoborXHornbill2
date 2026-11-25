import { NextResponse } from "next/server";
import {
  AdminAuthConfigError,
  getAdminAuthConfig,
  isAdminAuthConfigured,
} from "./config";
import { isTrustedAuthOrigin } from "./origin";
import {
  readAdminSessionCookie,
  verifyAdminSessionToken,
  type AdminSessionClaims,
} from "./session";

function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Authentication required." },
    { status: 401 }
  );
}

function unavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: "Authentication service is temporarily unavailable." },
    { status: 503 }
  );
}

/**
 * Verify the admin session cookie on a protected API request.
 * Call this before any MongoDB access on admin routes.
 */
export async function requireAdminSession(
  req: Request
): Promise<AdminSessionClaims | NextResponse> {
  if (!isAdminAuthConfigured()) {
    console.error("[AdminAuth] Admin auth environment is not configured.");
    return unavailableResponse();
  }

  try {
    const config = getAdminAuthConfig();
    const token = readAdminSessionCookie(req.headers.get("cookie"));
    if (!token) return unauthorizedResponse();

    const session = await verifyAdminSessionToken(token, config);
    if (!session) return unauthorizedResponse();

    return session;
  } catch (error) {
    if (error instanceof AdminAuthConfigError) {
      console.error("[AdminAuth] Config error:", error.message);
      return unavailableResponse();
    }
    console.error("[AdminAuth] Session verification failed:", error);
    return unauthorizedResponse();
  }
}

export function isAdminSessionResponse(
  value: AdminSessionClaims | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}

/**
 * Read and verify session from a Cookie header string (Server Components / proxy).
 */
export async function getAdminSessionFromCookieHeader(
  cookieHeader: string | null
): Promise<AdminSessionClaims | null> {
  if (!isAdminAuthConfigured()) return null;

  try {
    const config = getAdminAuthConfig();
    const token = readAdminSessionCookie(cookieHeader);
    if (!token) return null;
    return verifyAdminSessionToken(token, config);
  } catch {
    return null;
  }
}

function forbiddenOriginResponse(): NextResponse {
  return NextResponse.json(
    { error: "Invalid request origin." },
    { status: 403 }
  );
}

/**
 * Protect state-changing admin APIs: trusted origin + valid session.
 * Call before any database write on future admin CRUD routes.
 */
export async function requireAdminMutation(
  req: Request
): Promise<AdminSessionClaims | NextResponse> {
  let appOrigin: string | null = null;

  if (isAdminAuthConfigured()) {
    try {
      appOrigin = getAdminAuthConfig().appOrigin;
    } catch (error) {
      if (error instanceof AdminAuthConfigError) {
        console.error("[AdminAuth] Config error:", error.message);
        return unavailableResponse();
      }
      throw error;
    }
  } else {
    appOrigin = process.env.APP_ORIGIN?.trim() || null;
  }

  if (!isTrustedAuthOrigin(req, appOrigin)) {
    return forbiddenOriginResponse();
  }

  return requireAdminSession(req);
}
