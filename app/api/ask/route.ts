import { NextResponse } from "next/server";
import { orchestrateMessage } from "../../../lib/orchestrator";
import type { ConversationTurn } from "../../../lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isConversationTurn(value: unknown): value is ConversationTurn {
  if (!isRecord(value)) return false;
  const role = value.role;
  const text = value.text;
  return (
    (role === "user" || role === "assistant") && typeof text === "string"
  );
}

/** Narrow optional context fields to the orchestrator contract. */
function optionalContextField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const payload = isRecord(body) ? body : {};
    const { question, activeLocationId, activeTribe, conversationHistory } =
      payload;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "A valid question string is required in the request body." },
        { status: 400 }
      );
    }

    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length === 0) {
      return NextResponse.json(
        { error: "Question cannot be empty." },
        { status: 400 }
      );
    }

    // Sanitize conversationHistory to ensure expected format (last 4 messages / 2 turns)
    const validHistory: ConversationTurn[] = Array.isArray(conversationHistory)
      ? conversationHistory.filter(isConversationTurn).slice(-4)
      : [];

    const response = await orchestrateMessage({
      question: trimmedQuestion,
      conversationHistory: validHistory,
      activeLocationId: optionalContextField(activeLocationId),
      activeTribe: optionalContextField(activeTribe),
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API Ask] Orchestrator error:", error);
    return NextResponse.json(
      { error: "Failed to process question", details: String(error) },
      { status: 500 }
    );
  }
}
