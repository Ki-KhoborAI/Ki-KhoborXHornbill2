import { NextResponse } from "next/server";
import { ai, GEMINI_MODEL } from "../../../lib/gemini";
import { retrieveContext, type SourceRef } from "../../../lib/ragRetrieval";

interface CacheEntry {
  answer: string;
  sources: SourceRef[];
  expiresAt: number;
}

/**
 * In-memory cache for identical questions (5-minute TTL).
 * Note: This cache is stored in memory and resets on server restart.
 */
const questionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * In-memory per-IP rate limit (10 requests per minute).
 * Note: This in-memory implementation is intended for development and single-instance environments.
 * In production across multiple serverless functions or distributed containers, a shared store
 * (such as Redis or MongoDB) should be used.
 */
const ipRateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

/** Timeout in milliseconds for Gemini API calls */
const GEMINI_TIMEOUT_MS = 15000; // 15 seconds

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRateLimitMap.get(ip);

  if (!record || now >= record.resetAt) {
    ipRateLimitMap.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    // 1. Per-IP Rate Limiting (10 req/min)
    const clientIp = getClientIp(req);
    const isAllowed = checkRateLimit(clientIp);

    if (!isAllowed) {
      return NextResponse.json(
        { error: "The assistant is busy right now. Please try again in a minute." },
        { status: 429 }
      );
    }

    // 2. Parse and Validate Request Body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      !("question" in body) ||
      typeof (body as { question: unknown }).question !== "string"
    ) {
      return NextResponse.json(
        { error: "Question must be a non-empty string with a maximum of 500 characters." },
        { status: 400 }
      );
    }

    const rawQuestion = (body as { question: string }).question;
    const trimmedQuestion = rawQuestion.trim();

    if (trimmedQuestion.length === 0 || rawQuestion.length > 500) {
      return NextResponse.json(
        { error: "Question must be a non-empty string with a maximum of 500 characters." },
        { status: 400 }
      );
    }

    // 3. In-memory Cache Check (normalized question key)
    const normalizedKey = trimmedQuestion.toLowerCase();
    const cached = questionCache.get(normalizedKey);
    const now = Date.now();

    if (cached && now < cached.expiresAt) {
      return NextResponse.json({
        answer: cached.answer,
        sources: cached.sources,
      });
    }

    // 4. Retrieve Grounding Context from MongoDB Atlas
    const { context, sources } = await retrieveContext(trimmedQuestion);

    // 5. Construct Grounded Prompt for Gemini
    const prompt = `You are an AI assistant for the Ki-Khobor × Hornbill Festival 2026 platform.
Answer the user's question accurately, concisely, and politely.

Instructions:
1. Use the KNOWLEDGE BASE CONTEXT provided below to answer the user's question.
2. Do NOT use outside knowledge to fabricate festival dates, tribal information, performers, or schedules.
3. If the user is asking for specific festival or tribal information that is NOT covered in the context, say clearly: "I don't have that specific information in the Ki-Khobor knowledge base."
4. If a field in the context is listed as "Not available in current knowledge base", state that clearly rather than inventing details.
5. If the user asks a simple greeting or general introductory question, respond warmly and let them know you can help with Nagaland tribes, Hornbill festival overview, Kisama heritage, morungs, and cultural traditions.

KNOWLEDGE BASE CONTEXT:
${context.trim().length > 0 ? context : "No direct matches found in knowledge base."}

USER QUESTION:
${trimmedQuestion}`;

    // 6. Call Gemini Model with 15-second timeout
    const geminiCall = ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Gemini API call timed out after ${GEMINI_TIMEOUT_MS / 1000} seconds`));
      }, GEMINI_TIMEOUT_MS);
      if (typeof timer.unref === "function") timer.unref();
    });

    const response = await Promise.race([geminiCall, timeoutPromise]);
    const answer = response.text?.trim() || "No response received from the assistant.";

    // 7. Cache Success Answer with Sources
    questionCache.set(normalizedKey, {
      answer,
      sources,
      expiresAt: now + CACHE_TTL_MS,
    });

    return NextResponse.json({ answer, sources });
  } catch (error: any) {
    // Check for rate limit or quota errors (429 / RESOURCE_EXHAUSTED)
    const isRateLimit =
      error?.status === 429 ||
      error?.code === 429 ||
      String(error?.message || "").includes("429") ||
      String(error?.message || "").includes("RESOURCE_EXHAUSTED") ||
      String(error?.message || "").toLowerCase().includes("quota");

    if (isRateLimit) {
      return NextResponse.json(
        { error: "The assistant is busy right now. Please try again in a minute." },
        { status: 429 }
      );
    }

    // Log the real error on the server side only (including timeouts and upstream errors);
    // never leak raw Gemini errors, timeouts, or stack traces to the client
    console.error("[Gemini Assistant Server Error]:", error?.message || error);

    return NextResponse.json(
      { error: "The assistant is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
