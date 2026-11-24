import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables (.env.local first, then .env)
dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * Default Gemini model constant.
 * Change this constant to switch models across the application.
 */
export const GEMINI_MODEL = "gemini-3.5-flash-lite";

/** Thrown when Gemini cannot be used due to missing/invalid local configuration. */
export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiConfigError";
  }
}

let geminiClient: GoogleGenAI | null = null;

/** True when a non-empty GEMINI_API_KEY is present in the environment. */
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/**
 * Lazily construct the Gemini client.
 * Does not throw at module import time — only when a Gemini call is attempted.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiConfigError(
      "Missing GEMINI_API_KEY environment variable. Please define it in your .env.local file."
    );
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: 15000 },
    });
  }

  return geminiClient;
}

/** Test helper — clears the cached client between cases. */
export function resetGeminiClientForTests(): void {
  geminiClient = null;
}
