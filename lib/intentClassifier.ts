import { ai, GEMINI_MODEL } from "./gemini";
import type { IntentClass } from "./types";

// ---------------------------------------------------------------------------
// Deterministic Intent Patterns
// ---------------------------------------------------------------------------

const GREETING_PATTERN =
  /^(hi|hello|hey|howdy|greetings|good\s+morning|good\s+afternoon|good\s+evening|good\s+day|how\s+are\s+you|how\s+r\s+u|hiya|yo|namaste|welcome|thanks|thank\s+you|cheers|bye|goodbye|see\s+ya)(\s+(there|everyone|all|ki[-\s]?khobor|friend|bot|assistant|so\s+much|very\s+much|a\s+lot))?\s*[!?.]*$/i;

const IDENTITY_PATTERN =
  /\b(who\s+are\s+you|what\s+is\s+ki-?khobor|what\s+can\s+you\s+(do|help|tell)|about\s+ki-?khobor|what\s+are\s+you|tell\s+me\s+about\s+yourself|help\s+me|your\s+capabilities|how\s+can\s+you\s+help)\b/i;

const PRIVATE_INFO_PATTERN =
  /wi[-\s]?fi\s*(password|pass|code|key|credential|access)|password\s*(for|at|of|to)|hotel\s*(pass|wifi|wi[-\s]?fi|credential|room\s*key|check[- ]?in\s*code)|booking\s*(confirm|reference|code|number|pin)|room\s*(number|key|access)|check[- ]?in\s*(code|pin|password)/i;

const POLITICAL_QUERY_PATTERN =
  /\b(chief\s+minister|cm\s+of|governor\s+of|cm\b|mla\b|mp\b|minister\s+of|home\s+minister|cabinet\s+minister|government\s+official|politician|election|vote|party\s+(in\s+)?(power|government))\b/i;

const PACKING_QUERY_PATTERN =
  /\b(pack(ing)?|bring(ing)?|luggage|gear|what\s+to\s+wear|what\s+should\s+.*(bring|pack|carry)|items?\s+to\s+bring)\b/i;

const FESTIVAL_ACTIVITIES_PATTERN =
  /\b(what\s+can\s+(i|we)\s+(do|see|experience|enjoy)|what\s+(is\s+there|are\s+there)\s+to\s+(do|see)|things?\s+to\s+do|activities?\s+(to\s+do\s+(at|during|in|around)|at|during|in|around)|experiences?\s+(at|during|at\s+the|during\s+the)|what\s+activities|what\s+can\s+visitors?\s+(do|see)|what\s+to\s+do|what\s+do\s+(you|they)\s+do|what\s+happens\s+(at|during)|what\s+is\s+(there|on)\s+to\s+(do|see))\b/i;

const TRIBE_AGGREGATE_PATTERN =
  /how\s+many\s+.*tribes?|number\s+of\s+.*tribes?|count\s+of\s+.*tribes?|tribes?\s+count|name\s+(all\s+)?(the\s+)?(\d+\s+)?(naga\s+)?tribes|list\s+(all\s+)?(the\s+)?(\d+\s+)?(naga\s+)?tribes|what\s+are\s+the\s+(different\s+)?(\d+\s+)?(naga\s+)?tribes|tell\s+me\s+all\s+(the\s+)?(naga\s+)?tribe\s+names|give\s+me\s+(the\s+)?names\s+of\s+(the\s+)?tribes|which\s+tribes\s+(are\s+there|exist|live|are\s+represented)|all\s+(the\s+)?(\d+\s+)?(naga\s+)?tribes|list\s+of\s+tribes|naga\s+tribes(\s+and\s+their\s+cultures?)?/i;

const LOCATION_PATTERN =
  /\b(where\s+is\s+(the\s+)?(hornbill|festival|venue|held|located|taking\s+place)|location\s+of\s+(the\s+)?(hornbill|festival)|venue\s+of\s+(the\s+)?(hornbill|festival)|how\s+to\s+reach\s+(kisama|hornbill))\b/i;

const DATES_PATTERN =
  /\b(when\s+is\s+(the\s+)?(hornbill|festival)|dates?\s+of\s+(the\s+)?(hornbill|festival)|duration\s+of\s+(the\s+)?(hornbill|festival)|festival\s+dates?|timing\s+of\s+(the\s+)?(hornbill|festival)|which\s+month\s+is\s+hornbill)\b/i;

const FESTIVAL_OVERVIEW_PATTERN =
  /\b(what\s+is\s+(the\s+)?hornbill\s+festival|history\s+of\s+hornbill|why\s+is\s+it\s+called\s+hornbill|significance\s+of\s+hornbill\s+festival|purpose\s+of\s+(the\s+)?hornbill\s+festival)\b/i;

/**
 * Tier 1: Fast deterministic classification.
 * Returns null if the intent is ambiguous or requires Gemini interpretation.
 */
export function classifyIntentDeterministically(
  question: string,
  detectedTribeSlug: string | null
): IntentClass | null {
  const trimmed = question.trim();
  const lower = trimmed.toLowerCase();

  // 1. Guard against private information queries
  if (PRIVATE_INFO_PATTERN.test(lower)) {
    return "OUT_OF_SCOPE_PRIVATE";
  }

  // 2. Guard against political inquiries
  if (POLITICAL_QUERY_PATTERN.test(lower)) {
    return "OUT_OF_SCOPE_POLITICAL";
  }

  // 3. Guard against packing queries
  if (PACKING_QUERY_PATTERN.test(lower)) {
    return "OUT_OF_SCOPE_PACKING";
  }

  // 4. Conversational / greeting check (standalone)
  if (GREETING_PATTERN.test(trimmed)) {
    return "CONVERSATIONAL";
  }

  // 5. Identity inquiry
  if (IDENTITY_PATTERN.test(lower)) {
    return "IDENTITY_QUERY";
  }

  // 6. Morung queries - check BEFORE general tribe to ensure morung priority
  if (lower.includes("morung")) {
    return "FACTUAL_MORUNG";
  }

  // 7. Tribe list / aggregate queries (how many tribes, list 18 tribes)
  if (TRIBE_AGGREGATE_PATTERN.test(lower)) {
    return "FACTUAL_TRIBE_LIST";
  }

  // 8. Festival activities queries
  if (FESTIVAL_ACTIVITIES_PATTERN.test(lower)) {
    return "FACTUAL_ACTIVITIES";
  }

  // 9. Location queries
  if (LOCATION_PATTERN.test(lower)) {
    return "FACTUAL_LOCATION";
  }

  // 10. Dates / timing queries
  if (DATES_PATTERN.test(lower)) {
    return "FACTUAL_DATES";
  }

  // 11. Festival overview
  if (FESTIVAL_OVERVIEW_PATTERN.test(lower)) {
    return "FACTUAL_FESTIVAL";
  }

  // 12. Specific tribe query if a tribe slug is already identified
  if (detectedTribeSlug) {
    return "FACTUAL_TRIBE";
  }

  return null;
}

/**
 * Tier 2: Gemini-powered intent classification for ambiguous messages.
 * Uses a small schema-focused prompt and short timeout (3.5s).
 */
export async function classifyIntentWithGemini(question: string): Promise<IntentClass> {
  const prompt = `You are an intent classifier for the Ki-Khobor Hornbill Festival assistant.
Classify the user's message into EXACTLY ONE of the following intent classes:

CONVERSATIONAL: Greetings, thanks, polite chit-chat, farewells
IDENTITY_QUERY: Asking who the assistant is or what it can do
FACTUAL_ACTIVITIES: Asking what to do, see, enjoy, or experience at the festival
FACTUAL_MORUNG: Inquiries about morungs (traditional dormitories)
FACTUAL_TRIBE_LIST: Inquiries about all 18 tribes or the count of tribes
FACTUAL_TRIBE: Inquiries about a specific Naga tribe, their culture, or traditions
FACTUAL_LOCATION: Inquiries about where the festival is held or how to reach
FACTUAL_DATES: Inquiries about when the festival occurs or festival dates
FACTUAL_FESTIVAL: Overview, history, or purpose of the Hornbill Festival
FACTUAL_KNOWLEDGE: All other factual, informational, activity, regulation, nature, or general knowledge inquiries
OUT_OF_SCOPE_PRIVATE: Strictly hotel Wi-Fi passwords, personal booking codes, room key credentials
OUT_OF_SCOPE_POLITICAL: Current government leaders, CM, governor, politics, elections
OUT_OF_SCOPE_PACKING: Packing lists, luggage advice, what clothing to pack

User message: "${question.replace(/"/g, '\\"')}"

Respond with ONLY the exact intent class name, nothing else.`;

  try {
    const callPromise = ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("Intent classification timeout")), 3500);
      if (typeof timer.unref === "function") timer.unref();
    });

    const response = await Promise.race([callPromise, timeoutPromise]);
    const rawClass = response.text?.trim().toUpperCase();

    const VALID_CLASSES: IntentClass[] = [
      "CONVERSATIONAL",
      "IDENTITY_QUERY",
      "FACTUAL_ACTIVITIES",
      "FACTUAL_MORUNG",
      "FACTUAL_TRIBE_LIST",
      "FACTUAL_TRIBE",
      "FACTUAL_LOCATION",
      "FACTUAL_DATES",
      "FACTUAL_FESTIVAL",
      "FACTUAL_KNOWLEDGE",
      "OUT_OF_SCOPE_PRIVATE",
      "OUT_OF_SCOPE_POLITICAL",
      "OUT_OF_SCOPE_PACKING",
    ];

    for (const valid of VALID_CLASSES) {
      if (rawClass?.includes(valid)) {
        return valid;
      }
    }
  } catch (err) {
    console.warn("[IntentClassifier] Gemini classification error/timeout, defaulting to FACTUAL_KNOWLEDGE:", err);
  }

  return "FACTUAL_KNOWLEDGE";
}

/**
 * Unified intent classifier: Tier 1 deterministic first, Tier 2 Gemini if ambiguous.
 */
export async function classifyIntent(
  question: string,
  detectedTribeSlug: string | null
): Promise<IntentClass> {
  const deterministicResult = classifyIntentDeterministically(question, detectedTribeSlug);
  if (deterministicResult) {
    return deterministicResult;
  }
  return classifyIntentWithGemini(question);
}
