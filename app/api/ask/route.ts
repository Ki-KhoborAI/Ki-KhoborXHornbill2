import { NextResponse } from "next/server";
import { toPublicAskResponse } from "../../../lib/apiPublicResponse";
import {
  parseAskRequestBody,
  readJsonBodyWithLimit,
} from "../../../lib/apiRequestValidation";
import { GeminiConfigError } from "../../../lib/gemini";
import { orchestrateMessage } from "../../../lib/orchestrator";
import { enforceAiRateLimit } from "../../../lib/rateLimit";

export async function POST(req: Request) {
  try {
    // Shared Redis rate limit before any expensive AI / DB work.
    const rateLimited = await enforceAiRateLimit(req);
    if (rateLimited) return rateLimited;

    const bodyResult = await readJsonBodyWithLimit(req);
    if (!bodyResult.ok) return bodyResult.response;

    const parsed = parseAskRequestBody(bodyResult.body);
    if (!parsed.ok) return parsed.response;

    const { question, activeLocationId, activeTribe, conversationHistory } =
      parsed.data;

    const response = await orchestrateMessage({
      question,
      conversationHistory,
      activeLocationId,
      activeTribe,
    });

    return NextResponse.json(toPublicAskResponse(response));
  } catch (error) {
    console.error("[API Ask] Orchestrator error:", error);

    if (error instanceof GeminiConfigError) {
      return NextResponse.json(
        {
          error:
            "The assistant is temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process question. Please try again later." },
      { status: 500 }
    );
  }
}
