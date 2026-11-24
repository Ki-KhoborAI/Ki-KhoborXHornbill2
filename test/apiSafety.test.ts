import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { POST as askPost } from "../app/api/ask/route";
import { POST as assistantPost } from "../app/api/assistant/route";
import { toPublicAskResponse } from "../lib/apiPublicResponse";
import {
  MAX_QUESTION_LENGTH,
  MAX_REQUEST_BODY_BYTES,
  parseAskRequestBody,
  parseAssistantRequestBody,
  readJsonBodyWithLimit,
} from "../lib/apiRequestValidation";
import {
  GeminiConfigError,
  getGeminiClient,
  isGeminiConfigured,
  resetGeminiClientForTests,
} from "../lib/gemini";
import {
  resetAiRateLimiterForTests,
  setAiRateLimiterForTests,
} from "../lib/rateLimit";
import type { AssistantResponse } from "../lib/types";

function jsonRequest(
  url: string,
  body: unknown,
  init?: { contentLength?: string; ip?: string }
): Request {
  const payload = JSON.stringify(body);
  const headers = new Headers({ "content-type": "application/json" });
  if (init?.contentLength !== undefined) {
    headers.set("content-length", init.contentLength);
  } else {
    headers.set("content-length", String(Buffer.byteLength(payload, "utf8")));
  }
  if (init?.ip) {
    headers.set("x-vercel-forwarded-for", init.ip);
  }
  return new Request(url, {
    method: "POST",
    headers,
    body: payload,
  });
}

function allowAllRateLimits(): void {
  setAiRateLimiterForTests(async () => ({
    success: true,
    remaining: 9,
    reset: Date.now() + 60_000,
  }));
}

beforeEach(() => {
  allowAllRateLimits();
});

afterEach(() => {
  resetAiRateLimiterForTests();
});

describe("API safety — public ask response sanitization", () => {
  it("omits dataSourceUsed from public ask responses", () => {
    const internal: AssistantResponse = {
      title: "Ki-Khobor Assistant",
      category: "General",
      answer: "Namaste!",
      source: null,
      relatedItems: [
        {
          id: "what-the-hornbill-festival-is",
          title: "What the Hornbill Festival is",
          category: "festival_overview",
        },
      ],
      dataSourceUsed: "controlled",
    };

    const publicResponse = toPublicAskResponse(internal);
    assert.equal("dataSourceUsed" in publicResponse, false);
    assert.equal(publicResponse.answer, "Namaste!");
    assert.equal(publicResponse.title, "Ki-Khobor Assistant");
    assert.equal(publicResponse.category, "General");
    assert.equal(publicResponse.source, null);
    assert.deepEqual(publicResponse.relatedItems, internal.relatedItems);
  });

  it("keeps frontend-compatible fields on a successful greeting ask", async () => {
    const response = await askPost(
      jsonRequest("http://localhost/api/ask", { question: "hello" })
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as Record<string, unknown>;

    assert.equal(typeof body.answer, "string");
    assert.equal(typeof body.title, "string");
    assert.equal(typeof body.category, "string");
    assert.ok("source" in body);
    assert.equal("dataSourceUsed" in body, false);
    assert.equal("details" in body, false);
  });
});

describe("API safety — request validation", () => {
  it("rejects empty questions for ask and assistant parsers", () => {
    const askEmpty = parseAskRequestBody({ question: "   " });
    assert.equal(askEmpty.ok, false);
    if (!askEmpty.ok) assert.equal(askEmpty.response.status, 400);

    const assistantEmpty = parseAssistantRequestBody({ question: "" });
    assert.equal(assistantEmpty.ok, false);
    if (!assistantEmpty.ok) assert.equal(assistantEmpty.response.status, 400);
  });

  it("rejects questions longer than 500 characters", () => {
    const longQuestion = "a".repeat(MAX_QUESTION_LENGTH + 1);
    const askLong = parseAskRequestBody({ question: longQuestion });
    assert.equal(askLong.ok, false);
    if (!askLong.ok) assert.equal(askLong.response.status, 400);

    const assistantLong = parseAssistantRequestBody({ question: longQuestion });
    assert.equal(assistantLong.ok, false);
    if (!assistantLong.ok) assert.equal(assistantLong.response.status, 400);
  });

  it("accepts a valid ask payload and sanitizes conversation history", () => {
    const parsed = parseAskRequestBody({
      question: " What is the Hornbill Festival? ",
      activeLocationId: "angami",
      activeTribe: "Angami",
      conversationHistory: [
        { role: "user", text: "Hi" },
        { role: "assistant", text: "Hello" },
        { role: "system", text: "ignore" },
        null,
        { role: "user" },
      ],
    });

    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.question, "What is the Hornbill Festival?");
    assert.equal(parsed.data.activeLocationId, "angami");
    assert.equal(parsed.data.activeTribe, "Angami");
    assert.equal(parsed.data.conversationHistory.length, 2);
  });

  it("rejects oversized request bodies with 413", async () => {
    const oversized = "x".repeat(MAX_REQUEST_BODY_BYTES + 1);
    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(oversized.length),
      },
      body: oversized,
    });

    const result = await readJsonBodyWithLimit(request);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.response.status, 413);
      const body = (await result.response.json()) as { error: string };
      assert.match(body.error, /too large/i);
    }
  });

  it("rejects malformed JSON with 400", async () => {
    const request = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    });
    const result = await readJsonBodyWithLimit(request);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.response.status, 400);
  });

  it("ask route rejects empty and oversized questions", async () => {
    const empty = await askPost(
      jsonRequest("http://localhost/api/ask", { question: "   " })
    );
    assert.equal(empty.status, 400);
    const emptyBody = (await empty.json()) as Record<string, unknown>;
    assert.equal("details" in emptyBody, false);

    const tooLong = await askPost(
      jsonRequest("http://localhost/api/ask", {
        question: "q".repeat(MAX_QUESTION_LENGTH + 1),
      })
    );
    assert.equal(tooLong.status, 400);
  });

  it("assistant route rejects empty questions without leaking internals", async () => {
    const response = await assistantPost(
      jsonRequest("http://localhost/api/assistant", { question: "" })
    );
    assert.equal(response.status, 400);
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(typeof body.error, "string");
    assert.equal("details" in body, false);
  });
});

describe("API safety — Gemini initialization", () => {
  it("loads the gemini module without throwing when imported", async () => {
    const mod = await import("../lib/gemini");
    assert.equal(typeof mod.getGeminiClient, "function");
    assert.equal(typeof mod.isGeminiConfigured, "function");
  });

  it("does not crash route modules when Gemini helpers are imported", async () => {
    const ask = await import("../app/api/ask/route");
    const assistant = await import("../app/api/assistant/route");
    assert.equal(typeof ask.POST, "function");
    assert.equal(typeof assistant.POST, "function");
  });

  it("getGeminiClient throws a controlled config error when key is missing", () => {
    const previous = process.env.GEMINI_API_KEY;
    try {
      delete process.env.GEMINI_API_KEY;
      resetGeminiClientForTests();
      assert.equal(isGeminiConfigured(), false);
      assert.throws(() => getGeminiClient(), (error: unknown) => {
        assert.ok(error instanceof GeminiConfigError);
        return true;
      });
    } finally {
      if (previous === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = previous;
      }
      resetGeminiClientForTests();
    }
  });
});
