import dns from "node:dns";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables (.env.local first, then .env)
dotenv.config({ path: ".env.local" });
dotenv.config();

// Configure reliable DNS servers for external API resolution on Windows
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in restricted network environments
}

/**
 * Default Gemini model constant.
 * Change this constant to switch models across the application.
 */
export const GEMINI_MODEL = "gemini-3.5-flash-lite";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing GEMINI_API_KEY environment variable. Please define it in your .env.local file."
  );
}

/**
 * Singleton GoogleGenAI client instance configured with 15s HTTP timeout.
 */
export const ai = new GoogleGenAI({
  apiKey,
  httpOptions: { timeout: 15000 },
});
