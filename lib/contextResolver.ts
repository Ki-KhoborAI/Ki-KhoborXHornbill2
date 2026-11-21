import { detectTribeSlug, TRIBE_NAMES } from "./tribesData";
import type { ConversationTurn, ResolvedContext } from "./types";

/** Pronouns and demonstratives indicating a contextual reference */
const PRONOUN_REFERENCE_PATTERN =
  /\b(their|theirs|they|them|its|it|that|this|the\s+same|these)\b/i;

/** Follow-up attribute phrases that imply a tribe without naming one */
const TRIBE_ATTRIBUTE_FOLLOWUP_PATTERN =
  /\b(traditional\s+festival|festival|attire|dress|clothing|shawl|costume|traditions?|customs?|culture|significance|morung|dormitory|where\s+do\s+they\s+live|region|district|language|history)\b/i;

/**
 * Inspects conversation history (most recent first) to find the most recently
 * mentioned tribe slug.
 */
function findRecentTribeFromHistory(history: ConversationTurn[]): string | null {
  // Traverse history in reverse (most recent message first)
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (!turn || typeof turn.text !== "string") continue;
    const slug = detectTribeSlug(turn.text);
    if (slug) {
      return slug;
    }
  }
  return null;
}

/**
 * Resolves conversational pronouns and follow-up questions using recent history.
 *
 * Example:
 * - Turn 1: "Tell me about the Ao tribe."
 * - Turn 2: "What is their traditional festival?"
 * -> resolvedQuestion: "What is the traditional festival of the Ao tribe?"
 * -> detectedTribeSlug: "ao"
 * -> resolvedFromHistory: true
 */
export function resolveContext(
  question: string,
  conversationHistory: ConversationTurn[] = [],
  activeTribe?: string | null
): ResolvedContext {
  const trimmedQuestion = question.trim();
  const directTribeSlug = detectTribeSlug(trimmedQuestion);

  // If a tribe is directly mentioned in the current question, use it immediately
  if (directTribeSlug) {
    return {
      resolvedQuestion: trimmedQuestion,
      detectedTribeSlug: directTribeSlug,
      resolvedFromHistory: false,
    };
  }

  // Check if this looks like a follow-up inquiry referencing prior context
  const hasPronoun = PRONOUN_REFERENCE_PATTERN.test(trimmedQuestion);
  const hasAttributeQuery = TRIBE_ATTRIBUTE_FOLLOWUP_PATTERN.test(trimmedQuestion);
  const isShortQuery = trimmedQuestion.split(/\s+/).length <= 8;

  const isFollowUpLikely = hasPronoun || (hasAttributeQuery && isShortQuery);

  if (isFollowUpLikely) {
    // Look for previous tribe in history
    const historyTribeSlug = findRecentTribeFromHistory(conversationHistory);
    const targetTribeSlug = historyTribeSlug || (activeTribe ? activeTribe.toLowerCase() : null);

    if (targetTribeSlug && TRIBE_NAMES[targetTribeSlug]) {
      const tribeName = TRIBE_NAMES[targetTribeSlug];

      // Rewrite pronouns to be explicit
      let rewritten = trimmedQuestion;
      if (/\btheir\b/i.test(rewritten)) {
        rewritten = rewritten.replace(/\btheir\b/gi, `${tribeName} tribe's`);
      } else if (/\b(they|them|it|its|that tribe|this tribe)\b/i.test(rewritten)) {
        rewritten = rewritten.replace(
          /\b(they|them|it|its|that tribe|this tribe)\b/gi,
          `the ${tribeName} tribe`
        );
      } else {
        // Append context if it was an elliptical follow-up like "What about attire?" or "Traditional festival?"
        rewritten = `${trimmedQuestion} (referring to ${tribeName} tribe)`;
      }

      return {
        resolvedQuestion: rewritten,
        detectedTribeSlug: targetTribeSlug,
        resolvedFromHistory: true,
      };
    }
  }

  // If activeTribe is passed in (e.g. browsing a specific Morung/location page)
  if (activeTribe) {
    const slug = detectTribeSlug(activeTribe);
    if (slug) {
      return {
        resolvedQuestion: trimmedQuestion,
        detectedTribeSlug: slug,
        resolvedFromHistory: false,
      };
    }
  }

  return {
    resolvedQuestion: trimmedQuestion,
    detectedTribeSlug: null,
    resolvedFromHistory: false,
  };
}
