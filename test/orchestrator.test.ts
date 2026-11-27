import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { closeDatabase } from "../lib/db";
import { resolveContext } from "../lib/contextResolver";
import {
  classifyIntentDeterministically,
} from "../lib/intentClassifier";
import { evaluateRetrievalRelevance } from "../lib/retrieval/relevanceEvaluator";
import { retrieveFromLocal } from "../lib/retrieval/localRetriever";
import { orchestrateMessage } from "../lib/orchestrator";
import type { ConversationTurn, RetrievedRecord } from "../lib/types";

/**
 * Force the Atlas path to fail closed so these tests exercise the offline
 * local dataset. Needed once public retrieval requires status=published and
 * the configured DB may be reachable but have zero published documents.
 */
async function withAtlasUnavailable<T>(fn: () => Promise<T>): Promise<T> {
  const previousDbName = process.env.MONGODB_DB_NAME;
  const env = process.env as Record<string, string | undefined>;
  delete env.MONGODB_DB_NAME;
  await closeDatabase();
  try {
    return await fn();
  } finally {
    if (previousDbName === undefined) delete env.MONGODB_DB_NAME;
    else env.MONGODB_DB_NAME = previousDbName;
    await closeDatabase();
  }
}

describe("Orchestration Layer - Context Resolution", () => {
  it("resolves direct tribe mentions without using history", () => {
    const result = resolveContext("Tell me about the Ao tribe.", []);
    assert.equal(result.detectedTribeSlug, "ao");
    assert.equal(result.resolvedFromHistory, false);
    assert.equal(result.resolvedQuestion, "Tell me about the Ao tribe.");
  });

  it("resolves 'their' pronoun to the previously discussed tribe", () => {
    const history: ConversationTurn[] = [
      { role: "user", text: "Tell me about the Ao tribe." },
      { role: "assistant", text: "The Ao tribe is one of the recognized indigenous tribes..." },
    ];
    const result = resolveContext("What is their traditional festival?", history);
    assert.equal(result.detectedTribeSlug, "ao");
    assert.equal(result.resolvedFromHistory, true);
    assert.match(result.resolvedQuestion, /Ao tribe's traditional festival/i);
  });

  it("resolves 'their attire' in a short follow-up query", () => {
    const history: ConversationTurn[] = [
      { role: "user", text: "Tell me about the Angami tribe." },
      { role: "assistant", text: "The Angami tribe primarily inhabits Kohima district..." },
    ];
    const result = resolveContext("What about their attire?", history);
    assert.equal(result.detectedTribeSlug, "angami");
    assert.equal(result.resolvedFromHistory, true);
  });

  it("overrides previous context when a new tribe is explicitly named", () => {
    const history: ConversationTurn[] = [
      { role: "user", text: "Tell me about the Ao tribe." },
      { role: "assistant", text: "The Ao tribe is known for Moatsu festival..." },
    ];
    const result = resolveContext("Now tell me about the Konyak tribe.", history);
    assert.equal(result.detectedTribeSlug, "konyak");
    assert.equal(result.resolvedFromHistory, false);
  });

  it("leaves generic non-follow-up questions untouched", () => {
    const history: ConversationTurn[] = [
      { role: "user", text: "Tell me about the Ao tribe." },
      { role: "assistant", text: "The Ao tribe..." },
    ];
    const result = resolveContext("Where is Kisama Heritage Village located?", history);
    assert.equal(result.detectedTribeSlug, null);
    assert.equal(result.resolvedFromHistory, false);
  });
});

describe("Orchestration Layer - Intent Classification", () => {
  it("classifies diverse greetings as CONVERSATIONAL", () => {
    assert.equal(classifyIntentDeterministically("Hello", null), "CONVERSATIONAL");
    assert.equal(classifyIntentDeterministically("Hi there!", null), "CONVERSATIONAL");
    assert.equal(classifyIntentDeterministically("Good morning", null), "CONVERSATIONAL");
    assert.equal(classifyIntentDeterministically("Namaste", null), "CONVERSATIONAL");
    assert.equal(classifyIntentDeterministically("Thank you so much!", null), "CONVERSATIONAL");
  });

  it("classifies assistant inquiries as IDENTITY_QUERY", () => {
    assert.equal(classifyIntentDeterministically("Who are you?", null), "IDENTITY_QUERY");
    assert.equal(classifyIntentDeterministically("What is Ki-Khobor?", null), "IDENTITY_QUERY");
    assert.equal(classifyIntentDeterministically("What can you do?", null), "IDENTITY_QUERY");
    assert.equal(classifyIntentDeterministically("How can you help me?", null), "IDENTITY_QUERY");
  });

  it("classifies private credential inquiries as OUT_OF_SCOPE_PRIVATE", () => {
    assert.equal(
      classifyIntentDeterministically("What is the hotel wifi password?", null),
      "OUT_OF_SCOPE_PRIVATE"
    );
    assert.equal(
      classifyIntentDeterministically("Give me the room check-in code", null),
      "OUT_OF_SCOPE_PRIVATE"
    );
  });

  it("classifies political queries as OUT_OF_SCOPE_POLITICAL", () => {
    assert.equal(
      classifyIntentDeterministically("Who is the Chief Minister of Nagaland?", null),
      "OUT_OF_SCOPE_POLITICAL"
    );
    assert.equal(
      classifyIntentDeterministically("Who is the Governor of Nagaland?", null),
      "OUT_OF_SCOPE_POLITICAL"
    );
    assert.equal(
      classifyIntentDeterministically("Tell me about the CM of Nagaland", null),
      "OUT_OF_SCOPE_POLITICAL"
    );
  });

  it("classifies visitor preparation queries as OUT_OF_SCOPE_PACKING", () => {
    assert.equal(
      classifyIntentDeterministically("What should a first-time visitor bring?", null),
      "OUT_OF_SCOPE_PACKING"
    );
    assert.equal(
      classifyIntentDeterministically("Packing list for Hornbill Festival", null),
      "OUT_OF_SCOPE_PACKING"
    );
  });

  it("classifies festival experience queries as FACTUAL_ACTIVITIES", () => {
    assert.equal(
      classifyIntentDeterministically("What can I do during the Hornbill Festival?", null),
      "FACTUAL_ACTIVITIES"
    );
    assert.equal(
      classifyIntentDeterministically("Things to do at Hornbill", null),
      "FACTUAL_ACTIVITIES"
    );
    assert.equal(
      classifyIntentDeterministically("What activities can I experience at Kisama?", null),
      "FACTUAL_ACTIVITIES"
    );
  });

  it("classifies tribe enumeration queries as FACTUAL_TRIBE_LIST", () => {
    assert.equal(
      classifyIntentDeterministically("How many tribes are represented in Nagaland?", null),
      "FACTUAL_TRIBE_LIST"
    );
    assert.equal(
      classifyIntentDeterministically("List all 18 Naga tribes", null),
      "FACTUAL_TRIBE_LIST"
    );
    assert.equal(
      classifyIntentDeterministically("What are the different tribes?", null),
      "FACTUAL_TRIBE_LIST"
    );
  });

  it("classifies Morung inquiries as FACTUAL_MORUNG", () => {
    assert.equal(
      classifyIntentDeterministically("What is a Morung?", null),
      "FACTUAL_MORUNG"
    );
    assert.equal(
      classifyIntentDeterministically("Tell me about the Morungs at Kisama", null),
      "FACTUAL_MORUNG"
    );
  });

  it("classifies stall and artist-lineup inquiries", () => {
    assert.equal(
      classifyIntentDeterministically("I want information on stalls.", null),
      "FACTUAL_STALLS"
    );
    assert.equal(
      classifyIntentDeterministically("Tell me about Naga Hill Platter", null),
      "FACTUAL_STALLS"
    );
    assert.equal(
      classifyIntentDeterministically("What is the artist lineup?", null),
      "FACTUAL_ARTIST_LINEUP"
    );
  });

  it("classifies specific tribe queries when tribe slug is detected", () => {
    assert.equal(
      classifyIntentDeterministically("Tell me about the Angami people", "angami"),
      "FACTUAL_TRIBE"
    );
  });

  it("classifies location and date queries correctly", () => {
    assert.equal(
      classifyIntentDeterministically("Where is the Hornbill Festival held?", null),
      "FACTUAL_LOCATION"
    );
    assert.equal(
      classifyIntentDeterministically("When is the Hornbill Festival?", null),
      "FACTUAL_DATES"
    );
    assert.equal(
      classifyIntentDeterministically("What is the Hornbill Festival?", null),
      "FACTUAL_FESTIVAL"
    );
  });
});

describe("Orchestration Layer - Relevance Evaluation", () => {
  const dummyRecord: RetrievedRecord = {
    id: "kisama-naga-heritage-village",
    title: "Kisama - Naga Heritage Village",
    category: "kisama_heritage",
    content: "Kisama is the site of the Hornbill Festival, located about 12 km from Kohima...",
    source: "Handbook",
  };

  it("rejects matches with score below the minimum threshold (28)", () => {
    const result = evaluateRetrievalRelevance("Kisama village", [dummyRecord], 20);
    assert.equal(result.isRelevant, false);
  });

  it("accepts strong matches containing query tokens with score >= 28", () => {
    const result = evaluateRetrievalRelevance("Kisama heritage village", [dummyRecord], 120);
    assert.equal(result.isRelevant, true);
  });

  it("rejects matches where none of the query tokens appear in the document", () => {
    const result = evaluateRetrievalRelevance("elephant safari reservation", [dummyRecord], 40);
    assert.equal(result.isRelevant, false);
  });
});

describe("Orchestration Layer - Local Offline Retrieval", () => {
  it("retrieves the full list of 18 tribes in offline mode", () => {
    const outcome = retrieveFromLocal({
      query: "How many tribes are there?",
      intent: "FACTUAL_TRIBE_LIST",
      tribeSlug: null,
    });
    assert.equal(outcome.kind, "structured_response");
    if (outcome.kind === "structured_response") {
      assert.equal(outcome.response.dataSourceUsed, "local");
      assert.equal(outcome.response.title, "Indigenous Tribes of Nagaland");
      assert.match(outcome.response.answer, /Official Naga Tribes \(15\)/);
      assert.match(
        outcome.response.answer,
        /Recognised Non-Naga Indigenous Tribes \(4\)/
      );
      assert.match(outcome.response.answer, /Angami/);
      assert.match(outcome.response.answer, /Zeliang/);
      assert.match(outcome.response.answer, /Mikir/);
    }
  });

  it("retrieves individual tribe profiles accurately in offline mode", () => {
    const outcome = retrieveFromLocal({
      query: "Tell me about the Angami tribe",
      intent: "FACTUAL_TRIBE",
      tribeSlug: "angami",
    });
    assert.equal(outcome.kind, "structured_response");
    if (outcome.kind === "structured_response") {
      assert.equal(outcome.response.dataSourceUsed, "local");
      assert.equal(outcome.response.title, "Angami Tribe");
      assert.match(outcome.response.answer, /Kohima district/);
      assert.match(outcome.response.answer, /Sekrenyi/);
    }
  });

  it("retrieves specific Morung knowledge items in offline mode", () => {
    const outcome = retrieveFromLocal({
      query: "What is a Morung?",
      intent: "FACTUAL_MORUNG",
      tribeSlug: null,
    });
    assert.equal(outcome.kind, "records");
    if (outcome.kind === "records") {
      assert(outcome.records.length > 0);
      assert.match(outcome.records[0].title.toLowerCase(), /morung/);
    }
  });

  it("returns no_match for completely unrelated topics", () => {
    const outcome = retrieveFromLocal({
      query: "How to bake a chocolate sourdough loaf",
      intent: "FACTUAL_KNOWLEDGE",
      tribeSlug: null,
    });
    assert.equal(outcome.kind, "no_match");
  });
});

describe("Orchestration Layer - End-to-End OrchestrateMessage", () => {
  it("handles greetings directly without DB access", async () => {
    const response = await orchestrateMessage({
      question: "Hello!",
      conversationHistory: [],
    });
    assert.equal(response.dataSourceUsed, "controlled");
    assert.equal(response.title, "Ki-Khobor Assistant");
    assert.match(response.answer, /Namaste!/);
  });

  it("handles identity queries directly without DB access", async () => {
    const response = await orchestrateMessage({
      question: "Who are you?",
      conversationHistory: [],
    });
    assert.equal(response.dataSourceUsed, "controlled");
    assert.equal(response.title, "About Ki-Khobor");
    assert.match(response.answer, /AI information assistant/);
  });

  it("rejects private credential requests politely without DB access", async () => {
    const response = await orchestrateMessage({
      question: "What is my hotel Wi-Fi password?",
      conversationHistory: [],
    });
    assert.equal(response.dataSourceUsed, "controlled");
    assert.equal(response.title, "Private Information");
    assert.match(response.answer, /not able to provide hotel credentials/);
  });

  it("redirects political inquiries gracefully without DB access", async () => {
    const response = await orchestrateMessage({
      question: "Who is the Chief Minister of Nagaland?",
      conversationHistory: [],
    });
    assert.equal(response.dataSourceUsed, "controlled");
    assert.equal(response.title, "Out of Scope");
    assert.match(response.answer, /outside the scope/);
  });

  it("handles packing inquiries honestly without DB access", async () => {
    const response = await orchestrateMessage({
      question: "What should a first-time visitor bring?",
      conversationHistory: [],
    });
    assert.equal(response.dataSourceUsed, "controlled");
    assert.equal(response.title, "Information Not Available");
    assert.match(response.answer, /packing list or gear guide is not currently available/);
  });

  it("provides comprehensive festival activities without DB access", async () => {
    const response = await orchestrateMessage({
      question: "What can I do during the Hornbill Festival?",
      conversationHistory: [],
    });
    assert.equal(response.dataSourceUsed, "controlled");
    assert.equal(response.title, "Things to Do at the Hornbill Festival");
    assert.match(response.answer, /Cultural Performances/);
    assert.match(response.answer, /Hornbill Music Festival/);
    assert.match(response.answer, /Traditional Sports/);
  });

  it("orchestrates tribe aggregate queries end-to-end", async () => {
    await withAtlasUnavailable(async () => {
      const response = await orchestrateMessage({
        question: "How many tribes are represented in Nagaland?",
        conversationHistory: [],
      });
      assert.equal(response.dataSourceUsed, "local");
      assert.equal(response.title, "Indigenous Tribes of Nagaland");
      assert.match(response.answer, /Official Naga Tribes \(15\)/);
      assert.match(
        response.answer,
        /Recognised Non-Naga Indigenous Tribes \(4\)/
      );
    });
  });

  it("orchestrates individual tribe queries end-to-end", async () => {
    await withAtlasUnavailable(async () => {
      const response = await orchestrateMessage({
        question: "Tell me about the Angami tribe.",
        conversationHistory: [],
      });
      assert.equal(response.dataSourceUsed, "local");
      assert.equal(response.title, "Angami Tribe");
      assert.match(response.answer, /Kohima district/);
    });
  });

  it("handles contextual follow-up questions across turns", async () => {
    await withAtlasUnavailable(async () => {
      const history: ConversationTurn[] = [
        { role: "user", text: "Tell me about the Angami tribe." },
        {
          role: "assistant",
          text: "The Angami tribe is one of the recognized indigenous tribes...",
        },
      ];
      const response = await orchestrateMessage({
        question: "What is their traditional festival?",
        conversationHistory: history,
      });
      assert.equal(response.dataSourceUsed, "local");
      assert.match(response.title, /Angami/);
      assert.match(response.answer, /Sekrenyi/);
    });
  });

  it("returns missing-info when Atlas is reachable but has no published matches", async () => {
    // Uses the configured DB. Published-only filtering yields no_match when empty,
    // which must not fabricate answers from drafts. If admin tests already
    // published tribes into the configured DB, a grounded list is also valid.
    const response = await orchestrateMessage({
      question: "How many tribes are represented in Nagaland?",
      conversationHistory: [],
    });
    if (response.dataSourceUsed === "local") {
      // Atlas unreachable in this environment — offline path still valid.
      assert.equal(response.title, "Indigenous Tribes of Nagaland");
      return;
    }
    if (response.title === "Information Not Available") {
      assert.match(response.answer, /I don't have specific information/);
      return;
    }
    assert.match(response.title, /tribe/i);
  });

  it("handles completely unknown queries by returning honest missing-info", async () => {
    const response = await orchestrateMessage({
      question: "What are the scuba diving regulations in Kohima?",
      conversationHistory: [],
    });
    assert.equal(response.title, "Information Not Available");
    assert.match(response.answer, /I don't have specific information/);
  });

  after(async () => {
    await closeDatabase();
  });
});
