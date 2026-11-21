import type { RetrievedRecord } from "../types";

const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can",
  "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
  "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have",
  "haven't", "having", "he", "her", "here", "him", "his", "how", "i", "if", "in", "into", "is", "isn't",
  "it", "its", "me", "more", "most", "my", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
  "other", "our", "out", "over", "own", "same", "she", "should", "so", "some", "such", "than", "that",
  "the", "their", "them", "then", "there", "these", "they", "this", "those", "through", "to", "too",
  "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who",
  "whom", "why", "with", "would", "you", "your", "tell", "give", "show", "know", "please"
]);

/**
 * Regional anchor words ubiquitous across the dataset.
 * When a query has specific subject tokens (e.g. "scuba diving in Kohima"),
 * matching only a regional anchor word in a document's body is insufficient.
 */
const REGIONAL_ANCHORS = new Set(["nagaland", "naga", "kohima"]);

/** Minimum score threshold for a knowledge item match to be considered relevant */
export const MIN_RELEVANCE_SCORE = 28;

/**
 * Evaluates whether retrieved records are genuinely relevant to the query.
 * Prevents returning unrelated records on weak single-word matches or passing
 * mentions of regional anchor words.
 */
export function evaluateRetrievalRelevance(
  query: string,
  records: RetrievedRecord[],
  primaryScore: number
): { isRelevant: boolean; reason?: string } {
  if (records.length === 0) {
    return { isRelevant: false, reason: "No records found" };
  }

  if (primaryScore < MIN_RELEVANCE_SCORE) {
    return {
      isRelevant: false,
      reason: `Primary score (${primaryScore}) below minimum threshold (${MIN_RELEVANCE_SCORE})`,
    };
  }

  const primary = records[0];
  const queryTokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  if (queryTokens.length === 0) {
    return { isRelevant: true };
  }

  const titleLower = primary.title.toLowerCase();
  const idLower = primary.id.toLowerCase();
  const categoryLower = primary.category.toLowerCase();
  const contentLower = (primary.content || "").toLowerCase();

  // Separate specific topic keywords from ubiquitous regional anchor words
  const topicTokens = queryTokens.filter((t) => !REGIONAL_ANCHORS.has(t));
  const tokensToCheck = topicTokens.length > 0 ? topicTokens : queryTokens;

  let matchingTokens = 0;
  for (const token of tokensToCheck) {
    if (
      titleLower.includes(token) ||
      idLower.includes(token) ||
      categoryLower.includes(token) ||
      contentLower.includes(token)
    ) {
      matchingTokens++;
    }
  }

  if (matchingTokens === 0) {
    return {
      isRelevant: false,
      reason: "No query topic keyword found in primary document",
    };
  }

  return { isRelevant: true };
}
