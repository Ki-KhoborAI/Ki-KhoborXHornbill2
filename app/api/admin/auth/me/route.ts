import { NextResponse } from "next/server";
import {
  isAdminSessionResponse,
  requireAdminSession,
} from "../../../../../lib/admin/auth/guard";

export async function GET(req: Request) {
  const session = await requireAdminSession(req);
  if (isAdminSessionResponse(session)) {
    return session;
  }

  return NextResponse.json(
    {
      authenticated: true,
      username: session.username,
    },
    { status: 200 }
  );
}
