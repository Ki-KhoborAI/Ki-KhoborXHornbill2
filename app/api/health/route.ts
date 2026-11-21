import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/db";

export async function GET() {
  try {
    const db = await getDatabase("kikhobor");
    await db.command({ ping: 1 });

    return NextResponse.json(
      { status: "ok", database: "connected" },
      { status: 200 }
    );
  } catch (error) {
    // Log minimal message on the server only without leaking credentials or internal error details
    console.warn("MongoDB Atlas health check ping failed");
    return NextResponse.json(
      { status: "error", database: "disconnected" },
      { status: 503 }
    );
  }
}

