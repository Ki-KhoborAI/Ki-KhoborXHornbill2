import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/db";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "connected";
  let collectionsCount: Record<string, number> = {};

  try {
    const db = await getDatabase();
    // Quick ping
    await db.command({ ping: 1 });

    const [kiCount, tribesCount] = await Promise.all([
      db.collection("knowledge_items").countDocuments(),
      db.collection("tribes").countDocuments(),
    ]);

    collectionsCount = {
      knowledge_items: kiCount,
      tribes: tribesCount,
    };
  } catch (error) {
    dbStatus = "disconnected";
    console.warn("Health check DB ping failed:", error);
  }

  const responseTimeMs = Date.now() - startTime;

  return NextResponse.json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    service: "Ki-Khobor Hornbill Next.js Unified API",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      collections: collectionsCount,
    },
    responseTimeMs,
  });
}

