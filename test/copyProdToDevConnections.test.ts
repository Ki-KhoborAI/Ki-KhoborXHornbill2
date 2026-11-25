import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DESTINATION_DB_NAME,
  MigrationCredentialError,
  SOURCE_DB_NAME,
  requireMandatoryUri,
  resolveMigrationConnections,
} from "../scripts/copy-prod-to-dev.connections";

describe("copy-prod-to-dev connection fail-closed behaviour", () => {
  it("hardcodes source and destination database names", () => {
    assert.equal(SOURCE_DB_NAME, "kikhobor");
    assert.equal(DESTINATION_DB_NAME, "kikhobor_dev");
  });

  it("rejects missing or empty mandatory URI values immediately", () => {
    assert.throws(
      () => requireMandatoryUri("MONGODB_URI_READONLY", undefined),
      MigrationCredentialError
    );
    assert.throws(
      () => requireMandatoryUri("MONGODB_URI_READONLY", ""),
      /MONGODB_URI_READONLY/
    );
    assert.throws(
      () => requireMandatoryUri("MONGODB_URI_DEV", "   "),
      /MONGODB_URI_DEV/
    );
  });

  it("does not fall back to shared MONGODB_URI when dedicated URIs are missing", () => {
    const shared =
      "mongodb+srv://shared-user:shared-pass@cluster.example.net/kikhobor";

    assert.throws(
      () =>
        resolveMigrationConnections({
          NODE_ENV: "test",
          MONGODB_URI: shared,
          MONGODB_URI_READONLY: undefined,
          MONGODB_URI_DEV: undefined,
        }),
      (error: unknown) => {
        assert.ok(error instanceof MigrationCredentialError);
        assert.match(error.message, /MONGODB_URI_READONLY/);
        assert.match(error.message, /not accepted as a fallback/);
        assert.equal(error.message.includes(shared), false);
        return true;
      }
    );

    assert.throws(
      () =>
        resolveMigrationConnections({
          NODE_ENV: "test",
          MONGODB_URI: shared,
          MONGODB_URI_READONLY: "mongodb+srv://ro:x@cluster.example.net/kikhobor",
          MONGODB_URI_DEV: "",
        }),
      /MONGODB_URI_DEV/
    );
  });

  it("resolves only the dedicated URIs when both are present", () => {
    const readonlyUri =
      "mongodb+srv://readonly:secret@cluster.example.net/?authSource=admin";
    const devUri =
      "mongodb+srv://devwriter:secret@cluster.example.net/?authSource=admin";
    const shared =
      "mongodb+srv://shared-user:shared-pass@cluster.example.net/kikhobor";

    const plan = resolveMigrationConnections({
      NODE_ENV: "test",
      MONGODB_URI: shared,
      MONGODB_URI_READONLY: readonlyUri,
      MONGODB_URI_DEV: devUri,
      MONGODB_DB_NAME: "should-be-ignored",
    });

    assert.equal(plan.sourceUri, readonlyUri);
    assert.equal(plan.destinationUri, devUri);
    assert.equal(plan.sourceDbName, "kikhobor");
    assert.equal(plan.destinationDbName, "kikhobor_dev");
    assert.notEqual(plan.sourceUri, shared);
    assert.notEqual(plan.destinationUri, shared);
  });
});
