import { NextResponse } from "next/server";
import {
  parseAssistantRequestBody,
  readJsonBodyWithLimit,
} from "../../../lib/apiRequestValidation";
import {
  GeminiConfigError,
  GEMINI_MODEL,
  getGeminiClient,
  isGeminiConfigured,
} from "../../../lib/gemini";
import { retrieveContext, type SourceRef } from "../../../lib/ragRetrieval";
import { enforceAiRateLimit } from "../../../lib/rateLimit";

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

/** Timeout in milliseconds for Gemini API calls */
const GEMINI_TIMEOUT_MS = 15000; // 15 seconds

function readErrorField(error: unknown, key: string): unknown {
  if (typeof error !== "object" || error === null) return undefined;
  if (!(key in error)) return undefined;
  return Reflect.get(error, key);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const message = readErrorField(error, "message");
  return typeof message === "string" ? message : "";
}

/** Detect Gemini / upstream rate-limit and quota exhaustion shapes. */
function isRateLimitError(error: unknown): boolean {
  const status = readErrorField(error, "status");
  const code = readErrorField(error, "code");
  const message = getErrorMessage(error);

  return (
    status === 429 ||
    code === 429 ||
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.toLowerCase().includes("quota")
  );
}

export async function POST(req: Request) {
  try {
    // 1. Shared Redis rate limit (ask + assistant share one budget per IP)
    const rateLimited = await enforceAiRateLimit(req);
    if (rateLimited) return rateLimited;

    // 2. Parse and Validate Request Body
    const bodyResult = await readJsonBodyWithLimit(req);
    if (!bodyResult.ok) return bodyResult.response;

    const parsed = parseAssistantRequestBody(bodyResult.body);
    if (!parsed.ok) return parsed.response;

    const trimmedQuestion = parsed.data.question;

    if (!isGeminiConfigured()) {
      console.error("[Gemini Assistant] Missing GEMINI_API_KEY");
      return NextResponse.json(
        {
          error:
            "The assistant is temporarily unavailable. Please try again later.",
        },
        { status: 503 }
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
    const gemini = getGeminiClient();
    const geminiCall = gemini.models.generateContent({
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
  } catch (error: unknown) {
    if (error instanceof GeminiConfigError) {
      console.error("[Gemini Assistant Config Error]:", error.message);
      return NextResponse.json(
        {
          error:
            "The assistant is temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    // Check for rate limit or quota errors (429 / RESOURCE_EXHAUSTED)
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: "The assistant is busy right now. Please try again in a minute." },
        { status: 429 }
      );
    }

    // Log the real error on the server side only (including timeouts and upstream errors);
    // never leak raw Gemini errors, timeouts, or stack traces to the client
    console.error(
      "[Gemini Assistant Server Error]:",
      getErrorMessage(error) || error
    );

    return NextResponse.json(
      { error: "The assistant is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
