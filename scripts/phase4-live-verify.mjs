/**
 * Phase 4 live verification — read-only diagnostics.
 * Never prints secrets, URIs, keys, or connection strings.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import knowledgeBase from "../data/knowledgeBase.json" with { type: "json" };
import { closeDatabase, getDatabase } from "../lib/db.ts";
import {
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
  resetGeminiClientForTests,
} from "../lib/gemini.ts";
import { classifyIntent } from "../lib/intentClassifier.ts";
import {
  isRateLimitConfigured,
  resetAiRateLimiterForTests,
  enforceAiRateLimit,
} from "../lib/rateLimit.ts";
import { orchestrateMessage } from "../lib/orchestrator.ts";
import { toPublicAskResponse } from "../lib/apiPublicResponse.ts";
import {
  HISTORICAL_2025_DATES_RECORD_ID,
  UNVERIFIED_DURATION_RECORD_ID,
} from "../lib/knowledgeQuality.ts";

const report = {
  env: {},
  atlas: {},
  gemini: {},
  redis: {},
  e2e: [],
  resilience: [],
};

function present(name) {
  return Boolean(process.env[name]?.trim());
}

report.env = {
  MONGODB_URI: present("MONGODB_URI"),
  GEMINI_API_KEY: present("GEMINI_API_KEY"),
  UPSTASH_REDIS_REST_URL: present("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: present("UPSTASH_REDIS_REST_TOKEN"),
};

function summarizeAnswer(response) {
  const answer = String(response?.answer || "");
  return {
    title: response?.title || null,
    category: response?.category || null,
    source: response?.source || null,
    dataSourceUsed: response?.dataSourceUsed || null,
    answerChars: answer.length,
    answerPreview: answer.slice(0, 280).replace(/\s+/g, " "),
    mentions2026ConfirmedRun:
      /Hornbill Festival 2026 runs for 10 days, from 1st to 10th December 2026/i.test(
        answer
      ),
    mentionsUnverified2026: /have not been verified|not.*confirmed|requires? official/i.test(
      answer
    ),
    mentionsAttireMissing: /not currently available/i.test(answer),
    hasObjectObject: answer.includes("[object Object]"),
  };
}

async function verifyAtlas() {
  const result = {
    connected: false,
    dbName: null,
    collections: [],
    tribesCount: null,
    knowledgeItemsCount: null,
    durationContentPreview: null,
    durationHasConfirmed2026Wording: null,
    durationMatchesLocal: null,
    objectObjectTribeCount: null,
    attireNullCount: null,
    sampleDiscrepancies: [],
    error: null,
  };

  try {
    const db = await getDatabase();
    result.connected = true;
    result.dbName = db.databaseName;
    const cols = await db.listCollections().toArray();
    result.collections = cols.map((c) => c.name).sort();

    const tribes = db.collection("tribes");
    const knowledge = db.collection("knowledge_items");
    result.tribesCount = await tribes.countDocuments();
    result.knowledgeItemsCount = await knowledge.countDocuments();

    const duration =
      (await knowledge.findOne({ slug: UNVERIFIED_DURATION_RECORD_ID })) ||
      (await knowledge.findOne({ slug: "festival-overview-duration-and-dates" })) ||
      (await knowledge.findOne({
        title: /duration and dates/i,
      }));

    const localDuration = knowledgeBase.find(
      (r) => r.id === UNVERIFIED_DURATION_RECORD_ID
    );

    if (duration) {
      const content = String(duration.content || "");
      result.durationContentPreview = content.slice(0, 180).replace(/\s+/g, " ");
      result.durationHasConfirmed2026Wording =
        /Hornbill Festival 2026 runs for 10 days, from 1st to 10th December 2026/i.test(
          content
        );
      result.durationMatchesLocal =
        content.trim() === String(localDuration?.content || "").trim();
      result.durationSlug = duration.slug || null;
      result.durationSourceLabel = duration.source
        ? String(duration.source).slice(0, 80)
        : null;
    } else {
      result.durationMissingInAtlas = true;
    }

    const hist =
      (await knowledge.findOne({ slug: HISTORICAL_2025_DATES_RECORD_ID })) ||
      (await knowledge.findOne({
        title: /Hornbill Festival 2025\s*-\s*Dates/i,
      }));
    result.historical2025Present = Boolean(hist);
    if (hist) {
      result.historical2025HasDisclaimer = /2026 dates must be confirmed/i.test(
        String(hist.content || "")
      );
    }

    const allTribes = await tribes.find({}).toArray();
    let objectObject = 0;
    let attireNull = 0;
    const corruptSlugs = [];
    for (const t of allTribes) {
      const blob = JSON.stringify(t);
      if (blob.includes("[object Object]")) {
        objectObject += 1;
        corruptSlugs.push(t.slug || t.name || "unknown");
      }
      if (t.traditionalAttire == null) attireNull += 1;
    }
    result.objectObjectTribeCount = objectObject;
    result.objectObjectTribeSlugs = corruptSlugs.slice(0, 20);
    result.attireNullCount = attireNull;
    result.localTribeCount = knowledgeBase.filter(
      (r) => r.category === "tribe_profile"
    ).length;

    // Compare a few high-risk fields without dumping full documents
    for (const slug of ["angami", "garo", "zeliang"]) {
      const atlasTribe = allTribes.find((t) => t.slug === slug);
      const localTribe = knowledgeBase.find((r) => r.id === `tribe-${slug}`);
      if (!atlasTribe || !localTribe) {
        result.sampleDiscrepancies.push({
          slug,
          issue: !atlasTribe ? "missing_in_atlas" : "missing_in_local",
        });
        continue;
      }
      const atlasTrad = String(atlasTribe.traditions || "");
      const localTrad = String(localTribe.attributes?.traditions || "");
      const atlasFest = String(atlasTribe.festivalDateOrSeason || "");
      const localFest = String(
        localTribe.attributes?.festivalDateOrSeason || ""
      );
      result.sampleDiscrepancies.push({
        slug,
        traditionsMatch: atlasTrad.trim() === localTrad.trim(),
        festivalDateMatch: atlasFest.trim() === localFest.trim(),
        atlasHasObjectObject: JSON.stringify(atlasTribe).includes(
          "[object Object]"
        ),
        atlasHasGaroJubilee:
          slug === "garo" && /Golden Jubilee|just under a month/i.test(atlasFest),
        atlasHasAngamiTruncation:
          slug === "angami" && /is a major on February/i.test(atlasTrad),
      });
    }
  } catch (err) {
    result.error = err instanceof Error ? err.name + ": " + err.message : "unknown";
  }

  report.atlas = result;
}

async function verifyGemini() {
  const result = {
    configured: isGeminiConfigured(),
    clientInit: false,
    livePing: null,
    intentClassification: null,
    missingKeyBehaviour: null,
    error: null,
  };

  try {
    if (!result.configured) {
      result.error = "GEMINI_API_KEY missing";
      report.gemini = result;
      return;
    }

    const client = getGeminiClient();
    result.clientInit = Boolean(client);

    const ping = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents:
        "Reply with exactly the three words: Ki Khobor ready",
    });
    const text = (ping.text || "").trim();
    result.livePing = {
      ok: /ki\s*khobor\s*ready/i.test(text),
      preview: text.slice(0, 80),
      model: GEMINI_MODEL,
    };

    const intent = await classifyIntent(
      "When is the Hornbill Festival held?",
      null
    );
    result.intentClassification = { intent, expected: "FACTUAL_DATES" };

    // Missing-key behaviour (temporary)
    const previous = process.env.GEMINI_API_KEY;
    try {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClientForTests();
      let threw = false;
      let name = null;
      try {
        getGeminiClient();
      } catch (e) {
        threw = true;
        name = e?.name || "Error";
      }
      result.missingKeyBehaviour = {
        threw,
        errorName: name,
        expectedName: "GeminiConfigError",
      };
    } finally {
      process.env.GEMINI_API_KEY = previous;
      resetGeminiClientForTests();
    }
  } catch (err) {
    result.error = err instanceof Error ? err.name + ": " + err.message : "unknown";
  }

  report.gemini = result;
}

async function verifyRedis() {
  const result = {
    configured: isRateLimitConfigured(),
    liveSharedLimit: null,
    live429: null,
    note: null,
  };

  if (!result.configured) {
    result.note =
      "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not present locally. Live Redis checks blocked. Unit tests cover 429/503 and shared-counter behaviour.";
    // Confirm missing-config path returns 503
    resetAiRateLimiterForTests();
    const res = await enforceAiRateLimit(
      new Request("http://localhost/api/ask", {
        method: "POST",
        headers: { "x-vercel-forwarded-for": "203.0.113.200" },
      })
    );
    result.missingConfigReturns503 = res?.status === 503;
    result.missingConfigHasGenericError = Boolean(
      res && (await res.clone().json()).error
    );
    report.redis = result;
    return;
  }

  // Live path with isolated TEST-NET IP to avoid impacting real visitors
  const testIp = "203.0.113.77";
  resetAiRateLimiterForTests();
  const statuses = [];
  for (let i = 0; i < 11; i += 1) {
    const res = await enforceAiRateLimit(
      new Request("http://localhost/api/ask", {
        method: "POST",
        headers: { "x-vercel-forwarded-for": testIp },
      })
    );
    statuses.push(res ? res.status : 200);
  }
  result.liveSharedLimit = {
    firstTenAllowed: statuses.slice(0, 10).every((s) => s === 200 || s == null),
    statusesSample: statuses,
  };
  const last = statuses[statuses.length - 1];
  result.live429 = { exceededStatus: last, expected: 429 };

  report.redis = result;
}

async function runE2E() {
  const questions = [
    "How many tribes are there in Nagaland?",
    "Tell me about the Angami tribe.",
    "Tell me about Angami traditional attire.",
    "What can I see at the Angami Morung?",
    "When is the Hornbill Festival held?",
    "What are the dates for Hornbill Festival 2026?",
    "What activities can visitors expect at the festival?",
    "What is the history of the Hornbill Festival?",
  ];

  for (const question of questions) {
    try {
      const response = await orchestrateMessage({
        question,
        conversationHistory: [],
      });
      const publicResponse = toPublicAskResponse(response);
      const summary = summarizeAnswer(response);
      report.e2e.push({
        question,
        ok: Boolean(response?.answer),
        summary,
        publicExposesDataSourceUsed: "dataSourceUsed" in publicResponse,
        publicHasAnswer: Boolean(publicResponse.answer),
      });
    } catch (err) {
      report.e2e.push({
        question,
        ok: false,
        error: err instanceof Error ? err.name + ": " + err.message : "unknown",
      });
    }
  }
}

async function runResilienceNotes() {
  // Controlled local checks that do not disrupt production services
  report.resilience.push({
    name: "Missing Redis config -> 503",
    result: report.redis.missingConfigReturns503 === true ? "pass" : "blocked_or_fail",
    detail: report.redis.note || null,
  });

  report.resilience.push({
    name: "Missing Gemini key throws GeminiConfigError",
    result:
      report.gemini.missingKeyBehaviour?.threw &&
      report.gemini.missingKeyBehaviour?.errorName === "GeminiConfigError"
        ? "pass"
        : "fail",
  });

  report.resilience.push({
    name: "Greeting path does not require Gemini (unit-covered)",
    result: "verified_by_unit_tests",
  });

  report.resilience.push({
    name: "Invalid JSON / oversized body / rate-limit (unit-covered Phase 1-2)",
    result: "verified_by_unit_tests",
  });

  report.resilience.push({
    name: "Atlas no_match does not trigger local fallback (orchestrator logic)",
    result: "code_verified",
    detail:
      "orchestrator.ts returns buildMissingInfoResponse on atlas no_match; fallback only in catch",
  });
}

try {
  console.log("Phase4: Atlas...");
  await verifyAtlas();
  console.log("Phase4: Gemini...");
  await verifyGemini();
  console.log("Phase4: Redis...");
  await verifyRedis();
  console.log("Phase4: E2E orchestrate...");
  await runE2E();
  await runResilienceNotes();
} finally {
  try {
    await closeDatabase();
  } catch {
    // ignore
  }
}

console.log(JSON.stringify(report, null, 2));
