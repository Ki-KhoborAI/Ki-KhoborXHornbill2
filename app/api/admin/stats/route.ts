import { NextResponse } from "next/server";
import {
  isAdminSessionResponse,
  requireAdminSession,
} from "../../../../lib/admin/auth/guard";
import {
  DatabaseConfigError,
  getAdminDashboardStats,
} from "../../../../lib/admin/stats";

/**
 * Read-only admin dashboard statistics.
 * Uses the configured MONGODB_DB_NAME database only.
 */
export async function GET(req: Request) {
  const session = await requireAdminSession(req);
  if (isAdminSessionResponse(session)) {
    return session;
  }

  try {
    const stats = await getAdminDashboardStats();
    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    if (error instanceof DatabaseConfigError) {
      console.error("[AdminStats] Database configuration error:", error.message);
      return NextResponse.json(
        { error: "Database is not configured." },
        { status: 503 }
      );
    }

    console.error(
      "[AdminStats] Failed to load dashboard statistics:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Unable to load dashboard statistics." },
      { status: 503 }
    );
  }
}
