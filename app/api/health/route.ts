import { NextResponse } from "next/server";
import {
  DatabaseConfigError,
  getConfiguredDatabaseName,
  getDatabase,
} from "../../../lib/db";

export async function GET() {
  try {
    const dbName = getConfiguredDatabaseName();
    const db = await getDatabase(dbName);
    await db.command({ ping: 1 });

    return NextResponse.json(
      { status: "ok", database: "connected" },
      { status: 200 }
    );
  } catch (error) {
    // Log minimal message on the server only without leaking credentials or internal error details
    if (error instanceof DatabaseConfigError) {
      console.warn("MongoDB health check failed: database name is not configured.");
    } else {
      console.warn("MongoDB Atlas health check ping failed");
    }
    return NextResponse.json(
      { status: "error", database: "disconnected" },
      { status: 503 }
    );
  }
}
