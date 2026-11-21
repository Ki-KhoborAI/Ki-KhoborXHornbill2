import { NextResponse } from "next/server";
import { orchestrateMessage } from "../../../lib/orchestrator";
import type { ConversationTurn } from "../../../lib/types";

export async function POST(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const { question, activeLocationId, activeTribe, conversationHistory } = body || {};

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
      ? conversationHistory
          .filter(
            (turn: any) =>
              turn &&
              (turn.role === "user" || turn.role === "assistant") &&
              typeof turn.text === "string"
          )
          .slice(-4)
      : [];

    const response = await orchestrateMessage({
      question: trimmedQuestion,
      conversationHistory: validHistory,
      activeLocationId,
      activeTribe,
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
