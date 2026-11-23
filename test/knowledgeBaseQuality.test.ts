import assert from "node:assert/strict";
import { describe, it } from "node:test";
import knowledgeBase from "../data/knowledgeBase.json";
import {
  HISTORICAL_2025_DATES_RECORD_ID,
  UNVERIFIED_DURATION_RECORD_ID,
  festivalDateContextScoreAdjustment,
  isUsableKnowledgeText,
  requiresOfficialConfirmation,
  usableKnowledgeText,
} from "../lib/knowledgeQuality";
import { retrieveFromLocal } from "../lib/retrieval/localRetriever";
import { formatTribeResponse } from "../lib/responseBuilder";
import type { LocalKnowledgeItem } from "../lib/types";

const items = knowledgeBase as LocalKnowledgeItem[];

function byId(id: string): LocalKnowledgeItem {
  const found = items.find((item) => item.id === id);
  assert.ok(found, `Missing knowledge record: ${id}`);
  return found;
}

describe("Knowledge-base quality — festival dates & provenance", () => {
  it("keeps 2025 handbook dates explicitly historical", () => {
    const record = byId(HISTORICAL_2025_DATES_RECORD_ID);
    assert.match(record.content || "", /2025/);
    assert.match(record.content || "", /2026 dates must be confirmed separately/i);
    assert.equal(record.attributes.editionYear, 2025);
    assert.equal(record.attributes.verificationStatus, "historical");
    assert.equal(record.attributes.notApplicableAsConfirmed2026, true);
    assert.match(record.source || "", /2025 Final Handbook/i);
  });

  it("does not treat unverified 2026 schedule wording as confirmed", () => {
    const record = byId(UNVERIFIED_DURATION_RECORD_ID);
    assert.doesNotMatch(
      record.content || "",
      /Hornbill Festival 2026 runs for 10 days, from 1st to 10th December 2026/i
    );
    assert.match(record.content || "", /have not been verified/i);
    assert.equal(record.attributes.verificationStatus, "unverified");
    assert.equal(record.attributes.claimCertainty, "unconfirmed");
    assert.equal(requiresOfficialConfirmation(record.attributes), true);
  });

  it("flags festival dates without adequate provenance", () => {
    const record = byId(UNVERIFIED_DURATION_RECORD_ID);
    assert.match(record.source || "", /unverified|Open Source Internet/i);
    assert.equal(record.attributes.requiresOfficialConfirmation, true);
    assert.ok(record.attributes.provenanceNote);
  });

  it("ranks duration guidance above 2025 edition cards for generic date queries", () => {
    const outcome = retrieveFromLocal({
      query: "When is the Hornbill Festival?",
      intent: "FACTUAL_DATES",
      tribeSlug: null,
    });
    assert.equal(outcome.kind, "records");
    if (outcome.kind !== "records") return;

    assert.equal(outcome.records[0]?.id, UNVERIFIED_DURATION_RECORD_ID);
    assert.ok(
      outcome.records.some((r) => r.id === HISTORICAL_2025_DATES_RECORD_ID),
      "historical 2025 record should remain retrievable in context"
    );
  });

  it("still elevates the 2025 handbook record when 2025 is asked explicitly", () => {
    const adjustmentGeneric = festivalDateContextScoreAdjustment({
      id: HISTORICAL_2025_DATES_RECORD_ID,
      title: "Hornbill Festival 2025 - Dates",
      category: "kisama_heritage",
      queryLower: "when is the hornbill festival?",
      attributes: { editionYear: 2025, verificationStatus: "historical" },
    });
    const adjustmentExplicit = festivalDateContextScoreAdjustment({
      id: HISTORICAL_2025_DATES_RECORD_ID,
      title: "Hornbill Festival 2025 - Dates",
      category: "kisama_heritage",
      queryLower: "what were the hornbill festival 2025 dates?",
      attributes: { editionYear: 2025, verificationStatus: "historical" },
    });
    assert.ok(adjustmentGeneric < 0);
    assert.ok(adjustmentExplicit > adjustmentGeneric);
  });
});

describe("Knowledge-base quality — tribal information", () => {
  const tribes = items.filter((item) => item.category === "tribe_profile");

  it("does not fabricate traditional attire for any tribe", () => {
    assert.equal(tribes.length, 18);
    for (const tribe of tribes) {
      assert.equal(
        tribe.attributes.traditionalAttire,
        null,
        `${tribe.id} must keep traditionalAttire null until researched`
      );
      const attireAnswer = formatTribeResponse(tribe, "attire", "local");
      assert.match(attireAnswer.answer, /not currently available/i);
    }
  });

  it("preserves existing verified tribal handbook sources where present", () => {
    const angami = byId("tribe-angami");
    assert.match(angami.source || "", /2025 Final Handbook/i);
    assert.equal(angami.attributes.tribeName, "Angami");
    assert.match(String(angami.attributes.traditions), /Sekrenyi/i);
    assert.ok(isUsableKnowledgeText(angami.attributes.traditions));
  });

  it("does not leave corrupted [object Object] serialization in tribe records", () => {
    for (const tribe of tribes) {
      assert.doesNotMatch(JSON.stringify(tribe), /\[object Object\]/);
    }
  });

  it("does not incorrectly mark missing or unverified tribe fields as verified", () => {
    for (const tribe of tribes) {
      assert.notEqual(tribe.attributes.verificationStatus, "verified");
      assert.notEqual(tribe.attributes.verificationStatus, "published");
      const quality = tribe.attributes.dataQuality as
        | Record<string, unknown>
        | undefined;
      if (quality?.traditionalAttireStatus) {
        assert.equal(quality.traditionalAttireStatus, "missing_needs_research");
      }
    }
  });

  it("treats corrupted tribe field text as missing in responses", () => {
    const response = formatTribeResponse(
      {
        id: "tribe-test",
        name: "Test",
        attributes: {
          tribeName: "Test",
          traditions: "[object Object]",
          traditionalAttire: null,
        },
      },
      "traditions",
      "local"
    );
    assert.match(response.answer, /not currently available/i);
    assert.equal(usableKnowledgeText("[object Object]"), undefined);
  });

  it("removed ephemeral Garo schedule boilerplate unrelated to Hornbill", () => {
    const garo = byId("tribe-garo");
    const festDate = String(garo.attributes.festivalDateOrSeason || "");
    assert.doesNotMatch(festDate, /just under a month away from today/i);
    assert.doesNotMatch(festDate, /Golden Jubilee/i);
    assert.match(festDate, /Wangala/i);
  });
});
