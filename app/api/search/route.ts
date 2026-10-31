import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim();
  const limit = Math.min(Number(searchParams.get("limit")) || 15, 50);

  if (!query && !category) {
    return NextResponse.json(
      { error: "Search query 'q' or 'category' parameter is required." },
      { status: 400 }
    );
  }

  try {
    const db = await getDatabase();
    const kiCol = db.collection("knowledge_items");
    const tribesCol = db.collection("tribes");

    const filter: Record<string, any> = {};
    if (category) {
      filter.category = category;
    }

    if (query) {
      const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { title: regex },
        { subtitle: regex },
        { content: regex },
        { "attributes.architecturalFeatures": regex },
        { "attributes.traditionalObjectsOrDisplays": regex },
      ];
    }

    const [knowledgeResults, tribeResults] = await Promise.all([
      kiCol.find(filter).limit(limit).toArray(),
      query
        ? tribesCol
            .find({
              $or: [
                { name: new RegExp(query, "i") },
                { traditionalFestivalName: new RegExp(query, "i") },
                { traditions: new RegExp(query, "i") },
                { culturalSignificance: new RegExp(query, "i") },
              ],
            })
            .limit(limit)
            .toArray()
        : [],
    ]);

    return NextResponse.json({
      query: query ?? null,
      category: category ?? null,
      total: knowledgeResults.length + tribeResults.length,
      results: {
        knowledgeItems: knowledgeResults,
        tribes: tribeResults,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Database search temporarily unavailable",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}

