import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/db";
import { searchKnowledge } from "../../../lib/knowledgeSearch";

const SYNONYMS: Record<string, string[]> = {
  where: ["location", "located", "venue", "place", "kisama", "kohima", "site", "address", "situated"],
  located: ["location", "venue", "place", "kisama", "kohima"],
  location: ["where", "venue", "place", "kisama", "kohima"],
  when: ["date", "dates", "timing", "timings", "december", "schedule", "time", "calendar"],
  dates: ["when", "schedule", "timing", "december", "calendar"],
  timing: ["timings", "time", "hours", "when", "schedule"],
  who: ["organises", "organizer", "organizers", "government", "department", "tafma"],
  why: ["purpose", "objectives", "history", "significance"],
  tribes: ["tribe", "angami", "ao", "konyak", "sumi", "lotha", "chakhesang", "communities"],
  morung: ["morungs", "dormitory", "village", "architecture", "kisama"],
  dzukou: ["valley", "trek", "trekking", "nature", "trail"],
};

const STOPWORDS = new Set([
  "is", "the", "a", "an", "in", "at", "of", "to", "for", "about", "and", "or", "can", "i", "tell", "me", "please", "give", "show", "know"
]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, activeLocationId, activeTribe } = body || {};

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "A valid question string is required in the request body." },
        { status: 400 }
      );
    }

    const trimmed = question.trim();
    const qLower = trimmed.toLowerCase();

    // 1. Attempt querying MongoDB Atlas directly
    try {
      const db = await getDatabase();
      const kiCol = db.collection("knowledge_items");
      const tribesCol = db.collection("tribes");

      // Check for broad tribes question
      if (
        qLower.includes("different tribes") ||
        qLower.includes("all tribes") ||
        qLower.includes("naga tribes") ||
        (qLower.includes("tribes") && !qLower.includes("morung"))
      ) {
        const tribes = await tribesCol.find({}).toArray();
        const listText = tribes
          .map((t: any) => `• ${t.name} (Festival: ${t.traditionalFestivalName?.split(":")[0] || "Festival"})`)
          .join("\n");

        return NextResponse.json({
          title: "The 18 Indigenous Tribes of Nagaland",
          category: "Culture & Tribes",
          answer:
            `Nagaland is home to 18 officially recognized indigenous tribes. Each possesses unique traditions, attire, handloom patterns, and seasonal harvest festivals:\n\n` +
            listText +
            `\n\nAll tribes gather annually at the Naga Heritage Village, Kisama, each residing in their traditional Morung during the Hornbill Festival.`,
          source: "Hornbill Festival Official Handbook",
          relatedItems: tribes.slice(0, 4).map((t: any) => ({
            id: `tribe-${t.slug}`,
            title: `${t.name} Tribe`,
            category: "tribe_profile",
          })),
        });
      }

      // Tokenize and expand synonyms
      const rawTokens = qLower
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1 && !STOPWORDS.has(w));

      const expandedTokens = new Set(rawTokens);
      for (const t of rawTokens) {
        if (SYNONYMS[t]) {
          for (const s of SYNONYMS[t]) expandedTokens.add(s);
        }
      }

      // Fetch all knowledge items from Atlas
      const items = await kiCol.find({}).toArray();

      const scored = items.map((item: any) => {
        let score = 0;
        const t = (item.title || "").toLowerCase();
        const c = (item.content || "").toLowerCase();
        const slug = (item.slug || "").toLowerCase();
        const cat = (item.category || "").toLowerCase();

        // Exact phrase match
        if (t === qLower) score += 150;
        else if (t.includes(qLower)) score += 70;
        if (c.includes(qLower)) score += 40;

        // Specific Intent Boosts
        if (rawTokens.includes("where") || rawTokens.includes("location") || rawTokens.includes("located") || rawTokens.includes("venue")) {
          if (slug === "location" || t === "location") score += 140;
          if (slug.includes("kisama") || t.includes("kisama")) score += 60;
        }

        if (rawTokens.includes("when") || rawTokens.includes("date") || rawTokens.includes("dates") || rawTokens.includes("timing") || rawTokens.includes("timings")) {
          if (slug.includes("date") || t.includes("date")) score += 140;
          if (slug.includes("timing") || t.includes("timing")) score += 100;
        }

        if (rawTokens.includes("who") || rawTokens.includes("organizer") || rawTokens.includes("organises") || rawTokens.includes("organized")) {
          if (slug.includes("organise") || t.includes("organise")) score += 140;
        }

        if (rawTokens.includes("morung") || rawTokens.includes("morungs")) {
          if (slug.includes("morung") || t.includes("morung")) score += 80;
        }

        // Active context boost
        if (activeTribe) {
          const atLower = activeTribe.toLowerCase();
          if (t.includes(atLower) || slug.includes(atLower)) score += 50;
        }
        if (activeLocationId) {
          const alLower = activeLocationId.toLowerCase();
          if (slug.includes(alLower)) score += 40;
        }

        // Token match scoring
        for (const tok of expandedTokens) {
          if (t === tok) score += 40;
          else if (t.includes(tok)) score += 20;
          if (slug === tok) score += 35;
          else if (slug.includes(tok)) score += 15;
          if (cat.includes(tok)) score += 10;
          if (c.includes(tok)) score += 5;
        }

        return { item, score };
      });

      scored.sort((a: any, b: any) => b.score - a.score);
      const topMatch = scored[0];

      if (topMatch && topMatch.score >= 12) {
        const primary = topMatch.item;
        const related = scored
          .slice(1, 4)
          .filter((s: any) => s.score >= 15 && s.item._id.toString() !== primary._id.toString())
          .map((s: any) => ({
            id: s.item.slug,
            title: s.item.title,
            category: s.item.category,
          }));

        return NextResponse.json({
          title: primary.title,
          category: (primary.category || "").replace(/_/g, " "),
          answer: primary.content || "Information available.",
          source: primary.source || null,
          attributes: primary.attributes || {},
          relatedItems: related,
        });
      }
    } catch (dbErr) {
      console.warn("[API Ask] Atlas connection note, using local dataset fallback:", dbErr);
    }

    // 2. Fallback to local knowledge search if Atlas query yields low score or is offline
    const localResult = searchKnowledge(trimmed, activeLocationId, activeTribe);
    return NextResponse.json(localResult);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to query knowledge base", details: String(error) },
      { status: 500 }
    );
  }
}
