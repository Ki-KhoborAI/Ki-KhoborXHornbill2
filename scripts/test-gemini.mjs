/**
 * End-to-end verification script for Gemini AI Assistant with RAG.
 * Usage: node scripts/test-gemini.mjs
 *
 * Sends a test question to http://localhost:3000/api/assistant if running,
 * or tests the Gemini integration directly. Never logs the API key.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { GoogleGenAI } from "@google/genai";

const TEST_QUESTION = "What is a Morung?";

async function main() {
  const url = "http://localhost:3000/api/assistant";

  // 1. Try testing via local running Next.js server
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: TEST_QUESTION }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`Endpoint returned HTTP ${res.status}:`, data.error || data);
      process.exit(1);
    }

    console.log("=== Gemini Assistant Test via HTTP Endpoint ===");
    console.log("Question:", TEST_QUESTION);
    console.log("Status  :", res.status);
    console.log("Sources :", data.sources ? data.sources.map((s) => s.slug).join(", ") : "None");
    console.log("Answer  :", data.answer);
    console.log("===============================================");
    return;
  } catch (err) {
    if (err.code !== "ECONNREFUSED" && err.cause?.code !== "ECONNREFUSED") {
      throw err;
    }
  }

  // 2. If dev server is not running, test directly with GoogleGenAI
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is not defined in environment or .env.local.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 15000 } });
  const res = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: TEST_QUESTION,
  });

  const answer = res.text?.trim() || "No response received.";
  console.log("=== Gemini Assistant Direct Test (Local Server Offline) ===");
  console.log("Question:", TEST_QUESTION);
  console.log("Answer  :", answer);
  console.log("===========================================================");
}

main().catch((err) => {
  console.error("Test failed:", err.message || err);
  process.exit(1);
});
