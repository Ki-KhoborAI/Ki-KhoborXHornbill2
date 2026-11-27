/**
 * Shared TypeScript types for the Ki-Khobor orchestration layer.
 * All orchestration modules import types from here — no cross-module type
 * duplication and no circular dependencies.
 */

// ---------------------------------------------------------------------------
// Intent classification
// ---------------------------------------------------------------------------

/** Classified intent for a visitor message. */
export type IntentClass =
  | "CONVERSATIONAL"           // Greeting, thanks, casual chat
  | "IDENTITY_QUERY"           // "What is Ki-Khobor?", "Who are you?"
  | "FACTUAL_TRIBE"            // Question about a specific Naga tribe
  | "FACTUAL_TRIBE_LIST"       // "How many tribes?", "List all tribes"
  | "FACTUAL_MORUNG"           // Any Morung question
  | "FACTUAL_FESTIVAL"         // Hornbill Festival overview / history
  | "FACTUAL_ACTIVITIES"       // Things to do / experiences at the festival
  | "FACTUAL_LOCATION"         // Where is the festival / venue
  | "FACTUAL_DATES"            // When, festival dates, duration
  | "FACTUAL_STALLS"           // Food stalls / vendors at Kisama
  | "FACTUAL_ARTIST_LINEUP"    // Artist / music lineup
  | "FACTUAL_KNOWLEDGE"        // General knowledge query (crafts, nature, music…)
  | "FOLLOWUP"                 // Contextual follow-up (pronoun, continuation)
  | "OUT_OF_SCOPE_PRIVATE"     // Hotel Wi-Fi, passwords, booking codes
  | "OUT_OF_SCOPE_POLITICAL"   // Politicians, government officials, elections
  | "OUT_OF_SCOPE_PACKING";    // What to bring / packing list

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

/** A single turn in the visitor conversation. */
export type ConversationTurn = {
  role: "user" | "assistant";
  text: string;
};

// ---------------------------------------------------------------------------
// Context resolution
// ---------------------------------------------------------------------------

/** Result returned by the context resolver. */
export type ResolvedContext = {
  /** Question after pronoun / entity resolution (may equal original question). */
  resolvedQuestion: string;
  /** Tribe slug detected in the current question or resolved from history. */
  detectedTribeSlug: string | null;
  /** True if the entity was inferred from prior conversation turns. */
  resolvedFromHistory: boolean;
};

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

/** A single retrieved knowledge document. */
export type RetrievedRecord = {
  id: string;
  title: string;
  category: string;
  content: string;
  attributes?: Record<string, unknown>;
  source: string | null;
};

/**
 * Bundled offline knowledge item (`data/knowledgeBase.json`).
 * Distinct from the importer's MongoDB `KnowledgeItem` schema type.
 */
export type LocalKnowledgeItem = {
  id: string;
  title: string;
  subtitle: string | null;
  category: string;
  content: string | null;
  attributes: Record<string, unknown>;
  source: string | null;
};

/**
 * Dual-shape tribe record used by formatters and offline search:
 * - Flat Atlas `tribes` collection documents
 * - Local knowledge items with tribe fields under `attributes`
 *
 * Index signature keeps MongoDB `Document` assignable (avoids weak-type
 * rejection when all known fields are optional) without call-site casts.
 */
export type TribeLike = {
  name?: string | null;
  slug?: string | null;
  id?: string | null;
  title?: string | null;
  source?: string | null;
  regionOrDistricts?: string | null;
  traditionalFestivalName?: string | null;
  festivalDateOrSeason?: string | null;
  traditions?: string | null;
  traditionalAttire?: string | null;
  culturalSignificance?: string | null;
  attributes?: Record<string, unknown>;
  [key: string]: unknown;
};

/** Narrow an unknown attribute / JSON value to a string. */
export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Prefer a flat tribe field, then a string attribute under the same key.
 * Preserves the historical `flat || attributes[key]` truthiness behaviour.
 */
export function tribeString(
  flat: string | null | undefined,
  attributes: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  return flat || asString(attributes?.[key]);
}

/**
 * What a retriever returns to the orchestrator.
 *
 * - `structured_response`: Fully formatted answer — no Gemini synthesis needed.
 * - `records`: Raw documents for Gemini to synthesise into a natural answer.
 * - `no_match`: Retrieval succeeded but found nothing relevant.
 */
export type RetrievalOutcome =
  | { kind: "structured_response"; response: AssistantResponse }
  | { kind: "records"; records: RetrievedRecord[]; primaryScore: number }
  | { kind: "no_match" };

// ---------------------------------------------------------------------------
// Request / Response
// ---------------------------------------------------------------------------

/** Request body forwarded to the orchestrator by the API route. */
export type OrchestratorRequest = {
  question: string;
  /** Last 4 messages (2 turns) from the client's conversation history. */
  conversationHistory: ConversationTurn[];
  activeLocationId?: string | null;
  activeTribe?: string | null;
};

/** Final structured response sent to the frontend. */
export type AssistantResponse = {
  title: string;
  category: string;
  answer: string;
  source: string | null;
  attributes?: Record<string, unknown>;
  relatedItems?: Array<{ id: string; title: string; category: string }>;
  /**
   * Internal tracking field — stripped at the `/api/ask` boundary via
   * `toPublicAskResponse` before sending to the client.
   * "controlled" = no DB access (greeting, identity, out-of-scope, etc.)
   */
  dataSourceUsed?: "atlas" | "local" | "controlled";
};
