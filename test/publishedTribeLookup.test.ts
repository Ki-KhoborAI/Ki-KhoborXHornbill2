import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchTribeSlugFromCatalog } from "../lib/retrieval/publishedTribeLookup";

describe("published tribe lookup", () => {
  it("matches admin-published tribes by name and slug", () => {
    const catalog = [
      { slug: "angami", name: "Angami" },
      { slug: "vinotto", name: "Vinotto" },
      { slug: "mhachentribe", name: "Mhachen Tribe" },
    ];

    assert.equal(
      matchTribeSlugFromCatalog("Tell me about vinotto tribe.", catalog),
      "vinotto"
    );
    assert.equal(
      matchTribeSlugFromCatalog("What is Mhachen Tribe known for?", catalog),
      "mhachentribe"
    );
    assert.equal(
      matchTribeSlugFromCatalog("Tell me about the Angami people", catalog),
      "angami"
    );
  });

  it("returns null when no published tribe is mentioned", () => {
    assert.equal(
      matchTribeSlugFromCatalog("Where is the Hornbill Festival?", [
        { slug: "vinotto", name: "Vinotto" },
      ]),
      null
    );
  });
});
