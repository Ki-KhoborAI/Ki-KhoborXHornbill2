import { resolveContext } from "./contextResolver";
import { classifyIntent } from "./intentClassifier";
import {
  buildFestivalActivitiesResponse,
  buildGreetingResponse,
  buildIdentityResponse,
  buildMissingInfoResponse,
  buildPackingUnavailableResponse,
  buildPoliticalResponse,
  buildPrivateInfoResponse,
  synthesizeGroundedResponse,
} from "./responseBuilder";
import { retrieveFromAtlas } from "./retrieval/atlasRetriever";
import { retrieveFromLocal } from "./retrieval/localRetriever";
import type { AssistantResponse, OrchestratorRequest } from "./types";

/**
 * Central orchestrator for the Ki-Khobor intelligent information assistant.
 * Determines the processing path, resolves conversation context, executes
 * appropriate data-source retrieval (Atlas primary -> local fallback on failure),
 * and formats grounded answers.
 */
export async function orchestrateMessage(
  request: OrchestratorRequest
): Promise<AssistantResponse> {
  const { question, conversationHistory = [], activeLocationId, activeTribe } = request;
  const rawQuestion = question?.trim() || "";

  if (!rawQuestion) {
    return buildGreetingResponse();
  }

  // 1. Resolve conversational context and pronouns
  const context = resolveContext(rawQuestion, conversationHistory, activeTribe);
  const { resolvedQuestion, detectedTribeSlug } = context;

  // 2. Classify intent (Tier 1 deterministic -> Tier 2 Gemini)
  const intent = await classifyIntent(resolvedQuestion, detectedTribeSlug);

  // 3. Handle Direct Controlled Paths (Zero DB / Zero Hallucination)
  switch (intent) {
    case "CONVERSATIONAL":
      return buildGreetingResponse();

    case "IDENTITY_QUERY":
      return buildIdentityResponse();

    case "OUT_OF_SCOPE_PRIVATE":
      return buildPrivateInfoResponse();

    case "OUT_OF_SCOPE_POLITICAL":
      return buildPoliticalResponse();

    case "OUT_OF_SCOPE_PACKING":
      return buildPackingUnavailableResponse();

    case "FACTUAL_ACTIVITIES":
      return buildFestivalActivitiesResponse();
  }

  // 4. Factual Knowledge Retrieval Path
  const retrieveParams = {
    query: resolvedQuestion,
    intent,
    tribeSlug: detectedTribeSlug,
    activeLocationId,
    activeTribe,
  };

  // 4a. Attempt primary data source: MongoDB Atlas
  try {
    const atlasOutcome = await retrieveFromAtlas(retrieveParams);

    if (atlasOutcome.kind === "structured_response") {
      return atlasOutcome.response;
    }

    if (atlasOutcome.kind === "records") {
      return await synthesizeGroundedResponse(
        resolvedQuestion,
        atlasOutcome.records,
        conversationHistory,
        "atlas"
      );
    }

    // A healthy database returning no records is NOT a connection error.
    // Do not trigger offline failover merely because a search returns zero matches.
    if (atlasOutcome.kind === "no_match") {
      return buildMissingInfoResponse(rawQuestion);
    }
  } catch (atlasErr) {
    console.warn(
      "[Orchestrator] Atlas connection failure, engaging offline local dataset fallback:",
      atlasErr instanceof Error ? atlasErr.message : atlasErr
    );
  }

  // 4b. Recoverable fallback data source: local knowledge base JSON
  try {
    const localOutcome = retrieveFromLocal(retrieveParams);

    if (localOutcome.kind === "structured_response") {
      return localOutcome.response;
    }

    if (localOutcome.kind === "records") {
      return await synthesizeGroundedResponse(
        resolvedQuestion,
        localOutcome.records,
        conversationHistory,
        "local"
      );
    }

    return buildMissingInfoResponse(rawQuestion);
  } catch (localErr) {
    console.error("[Orchestrator] Both Atlas and local knowledge retrieval failed:", localErr);
    return buildMissingInfoResponse(rawQuestion);
  }
}
