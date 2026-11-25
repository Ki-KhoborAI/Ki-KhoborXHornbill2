import { NextResponse } from "next/server";
import { getAdminAuthConfig, isAdminAuthConfigured } from "../../../../../lib/admin/auth/config";
import { isTrustedAuthOrigin } from "../../../../../lib/admin/auth/origin";
import { serializeClearedAdminSessionCookie } from "../../../../../lib/admin/auth/session";

export async function POST(req: Request) {
  const appOrigin = isAdminAuthConfigured()
    ? getAdminAuthConfig().appOrigin
    : process.env.APP_ORIGIN?.trim() || null;

  if (!isTrustedAuthOrigin(req, appOrigin)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.headers.append("Set-Cookie", serializeClearedAdminSessionCookie());
  return response;
}
