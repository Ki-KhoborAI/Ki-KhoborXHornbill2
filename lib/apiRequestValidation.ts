import { NextResponse } from "next/server";
import type { ConversationTurn } from "./types";

/** Maximum accepted question length for /api/ask and /api/assistant. */
export const MAX_QUESTION_LENGTH = 500;

/** Maximum raw JSON request body size (32 KiB). */
export const MAX_REQUEST_BODY_BYTES = 32 * 1024;

export type ParsedAskBody = {
  question: string;
  activeLocationId?: string | null;
  activeTribe?: string | null;
  conversationHistory: ConversationTurn[];
};

export type ParsedAssistantBody = {
  question: string;
};

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

function optionalContextField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

function validateQuestionString(
  question: unknown
): { ok: true; question: string } | { ok: false; response: NextResponse } {
  if (typeof question !== "string") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Question must be a non-empty string with a maximum of 500 characters.",
        },
        { status: 400 }
      ),
    };
  }

  const trimmed = question.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Question cannot be empty." },
        { status: 400 }
      ),
    };
  }

  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Question must be a non-empty string with a maximum of 500 characters.",
        },
        { status: 400 }
      ),
    };
  }

  return { ok: true, question: trimmed };
}

/**
 * Read and parse a JSON request body with Content-Length and raw-size guards.
 */
export async function readJsonBodyWithLimit(
  req: Request,
  maxBytes: number = MAX_REQUEST_BODY_BYTES
): Promise<
  { ok: true; body: unknown } | { ok: false; response: NextResponse }
> {
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Request body is too large." },
          { status: 413 }
        ),
      };
    }
  }

  let rawText: string;
  try {
    rawText = await req.text();
  } catch (error) {
    console.error("[API] Failed to read request body:", error);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      ),
    };
  }

  // UTF-16 string length is a practical upper bound for JSON text size.
  if (rawText.length > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Request body is too large." },
        { status: 413 }
      ),
    };
  }

  if (rawText.trim().length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      ),
    };
  }

  try {
    return { ok: true, body: JSON.parse(rawText) as unknown };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      ),
    };
  }
}

/** Parse and validate `/api/ask` request bodies. */
export function parseAskRequestBody(
  body: unknown
): { ok: true; data: ParsedAskBody } | { ok: false; response: NextResponse } {
  const payload = isRecord(body) ? body : {};
  const questionResult = validateQuestionString(payload.question);
  if (!questionResult.ok) return questionResult;

  const conversationHistory = Array.isArray(payload.conversationHistory)
    ? payload.conversationHistory.filter(isConversationTurn).slice(-4)
    : [];

  return {
    ok: true,
    data: {
      question: questionResult.question,
      activeLocationId: optionalContextField(payload.activeLocationId),
      activeTribe: optionalContextField(payload.activeTribe),
      conversationHistory,
    },
  };
}

/** Parse and validate `/api/assistant` request bodies. */
export function parseAssistantRequestBody(
  body: unknown
):
  | { ok: true; data: ParsedAssistantBody }
  | { ok: false; response: NextResponse } {
  const payload = isRecord(body) ? body : {};
  const questionResult = validateQuestionString(payload.question);
  if (!questionResult.ok) return questionResult;

  return {
    ok: true,
    data: { question: questionResult.question },
  };
}
