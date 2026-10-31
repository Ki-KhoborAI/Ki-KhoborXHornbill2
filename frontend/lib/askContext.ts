import type { Location } from "../data/locations";

/** Frontend request contract for the future globally scoped knowledge service. */
export type AskRequestContext = {
  activeLocationId: string | null;
  activeTribe: string | null;
  question: string;
  knowledgeScope: "global";
};

export const ASK_PREVIEW_ACKNOWLEDGEMENT =
  "Your question has been received. The AI knowledge service is not connected yet.";

export function createAskRequestContext(
  question: string,
  location?: Pick<Location, "id" | "tribeName">
): AskRequestContext {
  return {
    activeLocationId: location?.id ?? null,
    activeTribe: location?.tribeName ?? null,
    question,
    knowledgeScope: "global",
  };
}

export function logAskRequestContext(context: AskRequestContext): void {
  if (process.env.NODE_ENV === "development") {
    console.info("[Ki-Khobor preview] Ask request context", context);
  }
}
