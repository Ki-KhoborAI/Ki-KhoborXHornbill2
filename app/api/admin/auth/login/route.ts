import { NextResponse } from "next/server";
import {
  AdminAuthConfigError,
  getAdminAuthConfig,
  isAdminAuthConfigured,
} from "../../../../../lib/admin/auth/config";
import { isTrustedAuthOrigin } from "../../../../../lib/admin/auth/origin";
import {
  usernamesMatch,
  verifyAdminPassword,
} from "../../../../../lib/admin/auth/password";
import { enforceAdminLoginRateLimit } from "../../../../../lib/admin/auth/rateLimit";
import {
  createAdminSessionToken,
  serializeAdminSessionCookie,
} from "../../../../../lib/admin/auth/session";

const MAX_USERNAME_LENGTH = 128;
const MAX_PASSWORD_LENGTH = 256;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalidCredentials(): NextResponse {
  return NextResponse.json(
    { error: "Invalid credentials." },
    { status: 401 }
  );
}

function unavailable(): NextResponse {
  return NextResponse.json(
    { error: "Authentication service is temporarily unavailable." },
    { status: 503 }
  );
}

export async function POST(req: Request) {
  try {
    if (!isAdminAuthConfigured()) {
      console.error("[AdminAuth] Login attempted without admin auth configuration.");
      return unavailable();
    }

    const config = getAdminAuthConfig();

    if (!isTrustedAuthOrigin(req, config.appOrigin)) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 }
      );
    }

    const rateLimited = await enforceAdminLoginRateLimit(req);
    if (rateLimited) return rateLimited;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (
      !username ||
      !password ||
      username.length > MAX_USERNAME_LENGTH ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      return invalidCredentials();
    }

    const userOk = usernamesMatch(config.username, username);
    const passOk = await verifyAdminPassword(password, config.passwordHash);

    if (!userOk || !passOk) {
      return invalidCredentials();
    }

    const token = await createAdminSessionToken(config.username, config);
    const response = NextResponse.json({ ok: true }, { status: 200 });
    response.headers.append(
      "Set-Cookie",
      serializeAdminSessionCookie(token, config)
    );
    return response;
  } catch (error) {
    if (error instanceof AdminAuthConfigError) {
      console.error("[AdminAuth] Login config error:", error.message);
      return unavailable();
    }
    console.error("[AdminAuth] Login failed:", error);
    return unavailable();
  }
}
