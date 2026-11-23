import type { AssistantResponse } from "./types";

/** Public `/api/ask` JSON shape — excludes internal debugging fields. */
export type PublicAskResponse = {
  title: string;
  category: string;
  answer: string;
  source: string | null;
  attributes?: Record<string, unknown>;
  relatedItems?: Array<{ id: string; title: string; category: string }>;
};

/**
 * Strip internal-only fields (e.g. dataSourceUsed) before sending to clients.
 * Keeps the frontend contract: answer, title, category, source, relatedItems.
 */
export function toPublicAskResponse(
  response: AssistantResponse
): PublicAskResponse {
  const publicResponse: PublicAskResponse = {
    title: response.title,
    category: response.category,
    answer: response.answer,
    source: response.source,
  };

  if (response.attributes !== undefined) {
    publicResponse.attributes = response.attributes;
  }

  if (response.relatedItems !== undefined) {
    publicResponse.relatedItems = response.relatedItems;
  }

  return publicResponse;
}
