/**
 * Read-only verification of dedicated migration MongoDB accounts.
 *
 * Safety:
 * - Uses only MONGODB_URI_READONLY and MONGODB_URI_DEV (via resolveMigrationConnections).
 * - Shared MONGODB_URI is never read or used as a fallback.
 * - Touches only databases "kikhobor" (source) and "kikhobor_dev" (destination).
 * - Never inserts, updates, deletes, drops, or copies documents.
 * - Never prints connection strings, usernames, passwords, env values, or raw driver errors.
 *
 * Usage (after explicit approval):
 *   npx tsx scripts/verify-migration-connections.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { MongoClient, type Document } from "mongodb";
import {
  DESTINATION_DB_NAME,
  SOURCE_DB_NAME,
  resolveMigrationConnections,
} from "./copy-prod-to-dev.connections";

const SERVER_SELECTION_TIMEOUT_MS = 10000;

const EXPECTED_SOURCE_ROLE = "kikhobor-prod-readonly";
const EXPECTED_DESTINATION_ROLE = "kikhobor-dev-readwrite";

type ConnectionCheckLabel = "source" | "destination";
type IntendedAccess = "read-only" | "read-write";
type PrivilegeConsistency = "consistent" | "inconsistent" | "inconclusive";

type RoleEntry = {
  role: string;
  db: string;
};

type PrivilegeEntry = {
  resourceDb: string;
  resourceCollection: string;
  actions: string[];
};

type SafeErrorCategory =
  | "connect"
  | "ping"
  | "connectionStatus"
  | "listCollections"
  | "close"
  | "unexpected";

type ConnectionCheckResult = {
  label: ConnectionCheckLabel;
  dbName: string;
  intendedAccess: IntendedAccess;
  expectedRole: string;
  pingOk: boolean;
  connectionStatusOk: boolean;
  listCollectionsOk: boolean;
  roles: RoleEntry[];
  privileges: PrivilegeEntry[];
  privilegesAvailable: boolean;
  collectionNames: string[];
  hasExpectedRole: boolean;
  privilegeConsistency: PrivilegeConsistency;
  privilegeNotes: string[];
  errorCategories: SafeErrorCategory[];
  closeFailed: boolean;
};

const READ_ACTIONS = new Set([
  "find",
  "listCollections",
  "listIndexes",
  "collStats",
  "dbStats",
  "changeStream",
  "killCursors",
]);

const WRITE_ACTIONS = new Set([
  "insert",
  "update",
  "remove",
  "delete",
  "createCollection",
  "createIndex",
  "dropCollection",
  "dropIndex",
  "renameCollectionSameDB",
  "convertToCapped",
  "emptycapped",
  "collMod",
  "reIndex",
]);

function safeErrorMessage(category: SafeErrorCategory): string {
  switch (category) {
    case "connect":
      return "connection failed (details redacted)";
    case "ping":
      return "ping failed (details redacted)";
    case "connectionStatus":
      return "connectionStatus failed (details redacted)";
    case "listCollections":
      return "listCollections failed (details redacted)";
    case "close":
      return "client cleanup failed (details redacted)";
    default:
      return "unexpected failure (details redacted)";
  }
}

function extractRoles(status: Document | null): RoleEntry[] {
  if (!status || typeof status !== "object") return [];
  const authInfo = (status as { authInfo?: unknown }).authInfo;
  if (!authInfo || typeof authInfo !== "object") return [];
  const rawRoles = (authInfo as { authenticatedUserRoles?: unknown })
    .authenticatedUserRoles;
  if (!Array.isArray(rawRoles)) return [];

  const roles: RoleEntry[] = [];
  for (const entry of rawRoles) {
    if (!entry || typeof entry !== "object") continue;
    const role =
      typeof (entry as { role?: unknown }).role === "string"
        ? (entry as { role: string }).role
        : "";
    const db =
      typeof (entry as { db?: unknown }).db === "string"
        ? (entry as { db: string }).db
        : "";
    if (role) {
      roles.push({ role, db: db || "(unknown)" });
    }
  }
  return roles;
}

function extractPrivileges(status: Document | null): {
  privileges: PrivilegeEntry[];
  available: boolean;
} {
  if (!status || typeof status !== "object") {
    return { privileges: [], available: false };
  }
  const authInfo = (status as { authInfo?: unknown }).authInfo;
  if (!authInfo || typeof authInfo !== "object") {
    return { privileges: [], available: false };
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      authInfo,
      "authenticatedUserPrivileges"
    )
  ) {
    return { privileges: [], available: false };
  }

  const rawPrivileges = (authInfo as { authenticatedUserPrivileges?: unknown })
    .authenticatedUserPrivileges;
  if (!Array.isArray(rawPrivileges)) {
    return { privileges: [], available: false };
  }

  const privileges: PrivilegeEntry[] = [];
  for (const entry of rawPrivileges) {
    if (!entry || typeof entry !== "object") continue;
    const resource = (entry as { resource?: unknown }).resource;
    const actionsRaw = (entry as { actions?: unknown }).actions;

    let resourceDb = "(cluster-or-unspecified)";
    let resourceCollection = "(all-or-unspecified)";

    if (resource && typeof resource === "object") {
      const dbValue = (resource as { db?: unknown }).db;
      const collectionValue = (resource as { collection?: unknown }).collection;
      if (typeof dbValue === "string" && dbValue.length > 0) {
        resourceDb = dbValue;
      } else if (
        Object.prototype.hasOwnProperty.call(resource, "cluster") &&
        (resource as { cluster?: unknown }).cluster === true
      ) {
        resourceDb = "(cluster)";
        resourceCollection = "(n/a)";
      }
      if (typeof collectionValue === "string") {
        resourceCollection =
          collectionValue.length > 0 ? collectionValue : "(all collections)";
      }
    }

    const actions = Array.isArray(actionsRaw)
      ? actionsRaw
          .filter((action): action is string => typeof action === "string")
          .map((action) => action.trim())
          .filter(Boolean)
          .sort()
      : [];

    privileges.push({
      resourceDb,
      resourceCollection,
      actions,
    });
  }

  return { privileges, available: true };
}

function hasRole(roles: RoleEntry[], expected: string): boolean {
  return roles.some((entry) => entry.role === expected);
}

function assessPrivilegeConsistency(options: {
  intendedDb: string;
  intendedAccess: IntendedAccess;
  privilegesAvailable: boolean;
  privileges: PrivilegeEntry[];
}): { consistency: PrivilegeConsistency; notes: string[] } {
  const { intendedDb, intendedAccess, privilegesAvailable, privileges } =
    options;
  const notes: string[] = [];

  if (!privilegesAvailable) {
    notes.push(
      "authenticatedUserPrivileges unavailable; privilege assessment is INCONCLUSIVE"
    );
    return { consistency: "inconclusive", notes };
  }

  if (privileges.length === 0) {
    notes.push(
      "authenticatedUserPrivileges was empty; privilege assessment is INCONCLUSIVE"
    );
    return { consistency: "inconclusive", notes };
  }

  const relevant = privileges.filter(
    (entry) =>
      entry.resourceDb === intendedDb ||
      entry.resourceDb === "(cluster)" ||
      entry.resourceDb === "(cluster-or-unspecified)"
  );

  if (relevant.length === 0) {
    notes.push(
      `no privileges reported for database "${intendedDb}"; privilege assessment is INCONCLUSIVE`
    );
    return { consistency: "inconclusive", notes };
  }

  const allActions = new Set<string>();
  let touchesOtherNamedDb = false;

  for (const entry of privileges) {
    for (const action of entry.actions) {
      allActions.add(action);
    }
    if (
      entry.resourceDb !== intendedDb &&
      entry.resourceDb !== "(cluster)" &&
      entry.resourceDb !== "(cluster-or-unspecified)" &&
      entry.resourceDb !== "(unknown)"
    ) {
      touchesOtherNamedDb = true;
      notes.push(
        `privilege resource includes other database scope "${entry.resourceDb}"`
      );
    }
  }

  const hasAnyRead = [...allActions].some((action) => READ_ACTIONS.has(action));
  const hasAnyWrite = [...allActions].some((action) =>
    WRITE_ACTIONS.has(action)
  );
  const hasUnclassified = [...allActions].some(
    (action) => !READ_ACTIONS.has(action) && !WRITE_ACTIONS.has(action)
  );

  if (hasUnclassified) {
    notes.push(
      "one or more privilege actions are unclassified; privilege assessment is INCONCLUSIVE"
    );
    return { consistency: "inconclusive", notes };
  }

  if (intendedAccess === "read-only") {
    if (!hasAnyRead) {
      notes.push("no recognized read actions found for intended database");
      return { consistency: "inconclusive", notes };
    }
    if (hasAnyWrite) {
      notes.push(
        "write-capable actions appear in reported privileges (inconsistent with read-only intent)"
      );
      return { consistency: "inconsistent", notes };
    }
    if (touchesOtherNamedDb) {
      return { consistency: "inconsistent", notes };
    }
    notes.push(
      "reported privileges appear consistent with read-only intent (not experimentally proven)"
    );
    return { consistency: "consistent", notes };
  }

  // read-write intended
  if (!hasAnyRead) {
    notes.push("no recognized read actions found for intended database");
    return { consistency: "inconclusive", notes };
  }
  if (!hasAnyWrite) {
    notes.push(
      "no recognized write actions found; cannot confirm read-write intent from privileges alone"
    );
    return { consistency: "inconclusive", notes };
  }
  if (touchesOtherNamedDb) {
    return { consistency: "inconsistent", notes };
  }
  notes.push(
    "reported privileges appear consistent with read-write intent (write capability not experimentally proven)"
  );
  return { consistency: "consistent", notes };
}

async function closeClientSafely(
  client: MongoClient
): Promise<{ closeFailed: boolean }> {
  try {
    await client.close();
    return { closeFailed: false };
  } catch {
    // Never rethrow — cleanup failure must not hide earlier check failures.
    return { closeFailed: true };
  }
}

async function verifyConnection(options: {
  label: ConnectionCheckLabel;
  uri: string;
  dbName: typeof SOURCE_DB_NAME | typeof DESTINATION_DB_NAME;
  expectedRole: string;
  intendedAccess: IntendedAccess;
}): Promise<ConnectionCheckResult> {
  const { label, uri, dbName, expectedRole, intendedAccess } = options;
  const result: ConnectionCheckResult = {
    label,
    dbName,
    intendedAccess,
    expectedRole,
    pingOk: false,
    connectionStatusOk: false,
    listCollectionsOk: false,
    roles: [],
    privileges: [],
    privilegesAvailable: false,
    collectionNames: [],
    hasExpectedRole: false,
    privilegeConsistency: "inconclusive",
    privilegeNotes: [],
    errorCategories: [],
    closeFailed: false,
  };

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
  });

  try {
    try {
      await client.connect();
    } catch {
      result.errorCategories.push("connect");
      return result;
    }

    // Explicit database selection — never rely on URI path; never touch a third DB.
    const db = client.db(dbName);

    try {
      await db.command({ ping: 1 });
      result.pingOk = true;
    } catch {
      result.errorCategories.push("ping");
    }

    try {
      const status = await db.command({
        connectionStatus: 1,
        showPrivileges: true,
      });
      result.connectionStatusOk = true;
      result.roles = extractRoles(status);
      result.hasExpectedRole = hasRole(result.roles, expectedRole);
      if (!result.hasExpectedRole) {
        result.privilegeNotes.push(
          `expected role "${expectedRole}" not found among authenticated roles`
        );
      }

      const extracted = extractPrivileges(status);
      result.privileges = extracted.privileges;
      result.privilegesAvailable = extracted.available;

      const assessment = assessPrivilegeConsistency({
        intendedDb: dbName,
        intendedAccess,
        privilegesAvailable: extracted.available,
        privileges: extracted.privileges,
      });
      result.privilegeConsistency = assessment.consistency;
      result.privilegeNotes.push(...assessment.notes);
    } catch {
      result.errorCategories.push("connectionStatus");
      result.privilegeConsistency = "inconclusive";
      result.privilegeNotes.push(
        "connectionStatus unavailable; privilege assessment is INCONCLUSIVE"
      );
    }

    try {
      const collections = await db
        .listCollections({}, { nameOnly: true })
        .toArray();
      result.listCollectionsOk = true;
      result.collectionNames = collections
        .map((entry) =>
          typeof entry.name === "string" ? entry.name : "(unnamed-collection)"
        )
        .sort();
    } catch {
      result.errorCategories.push("listCollections");
    }
  } catch {
    result.errorCategories.push("unexpected");
  } finally {
    const { closeFailed } = await closeClientSafely(client);
    if (closeFailed) {
      result.closeFailed = true;
      result.errorCategories.push("close");
    }
  }

  return result;
}

function printResult(result: ConnectionCheckResult): void {
  console.log(`--- ${result.label} (${result.dbName}) ---`);
  console.log(`intended access: ${result.intendedAccess}`);
  console.log(`ping: ${result.pingOk ? "ok" : "FAILED"}`);
  console.log(
    `connectionStatus: ${result.connectionStatusOk ? "ok" : "FAILED"}`
  );
  console.log(
    `listCollections: ${result.listCollectionsOk ? "ok" : "FAILED"}`
  );
  console.log(`client cleanup: ${result.closeFailed ? "FAILED" : "ok"}`);

  if (result.roles.length > 0) {
    console.log("authenticated roles:");
    for (const entry of result.roles) {
      console.log(`  - ${entry.role} @ ${entry.db}`);
    }
  } else if (result.connectionStatusOk) {
    console.log("authenticated roles: (none reported)");
  }

  console.log(
    `expected role "${result.expectedRole}": ${
      result.hasExpectedRole ? "present" : "MISSING"
    }`
  );

  if (!result.privilegesAvailable) {
    console.log("authenticated privileges: UNAVAILABLE (INCONCLUSIVE)");
  } else if (result.privileges.length === 0) {
    console.log("authenticated privileges: empty (INCONCLUSIVE)");
  } else {
    console.log("authenticated privileges:");
    for (const entry of result.privileges) {
      const actions =
        entry.actions.length > 0 ? entry.actions.join(", ") : "(none)";
      console.log(
        `  - db=${entry.resourceDb} collection=${entry.resourceCollection} actions=[${actions}]`
      );
    }
  }

  console.log(
    `privilege consistency with intent: ${result.privilegeConsistency.toUpperCase()}`
  );
  for (const note of result.privilegeNotes) {
    console.log(`note: ${note}`);
  }

  if (result.listCollectionsOk) {
    console.log(
      `collections (${result.collectionNames.length}): ${
        result.collectionNames.length > 0
          ? result.collectionNames.join(", ")
          : "(none)"
      }`
    );
  }

  if (result.errorCategories.length > 0) {
    console.log("errors:");
    for (const category of result.errorCategories) {
      console.log(`  - ${safeErrorMessage(category)}`);
    }
  }
  console.log("");
}

function isSuccess(result: ConnectionCheckResult): boolean {
  // INCONCLUSIVE privilege assessment does not by itself fail the run;
  // INCONSISTENT privilege metadata does.
  return (
    result.pingOk &&
    result.connectionStatusOk &&
    result.listCollectionsOk &&
    result.hasExpectedRole &&
    result.privilegeConsistency !== "inconsistent" &&
    !result.closeFailed &&
    !result.errorCategories.includes("connect") &&
    !result.errorCategories.includes("ping") &&
    !result.errorCategories.includes("connectionStatus") &&
    !result.errorCategories.includes("listCollections") &&
    !result.errorCategories.includes("unexpected")
  );
}

async function main(): Promise<void> {
  // Fail closed on credentials before any MongoClient is constructed.
  // resolveMigrationConnections never falls back to shared MONGODB_URI.
  const connections = resolveMigrationConnections(process.env);

  console.log("=== Ki-Khobor migration connection verification (read-only) ===");
  console.log(`Source DB: ${SOURCE_DB_NAME}`);
  console.log(`Destination DB: ${DESTINATION_DB_NAME}`);
  console.log("Source URI env: MONGODB_URI_READONLY (value redacted)");
  console.log("Destination URI env: MONGODB_URI_DEV (value redacted)");
  console.log(`Expected source role: ${EXPECTED_SOURCE_ROLE}`);
  console.log(`Expected destination role: ${EXPECTED_DESTINATION_ROLE}`);
  console.log("");

  // Verify each account independently so one failure cannot skip the other.
  const sourceResult = await verifyConnection({
    label: "source",
    uri: connections.sourceUri,
    dbName: SOURCE_DB_NAME,
    expectedRole: EXPECTED_SOURCE_ROLE,
    intendedAccess: "read-only",
  });
  printResult(sourceResult);

  const destinationResult = await verifyConnection({
    label: "destination",
    uri: connections.destinationUri,
    dbName: DESTINATION_DB_NAME,
    expectedRole: EXPECTED_DESTINATION_ROLE,
    intendedAccess: "read-write",
  });
  printResult(destinationResult);

  const sourceOk = isSuccess(sourceResult);
  const destinationOk = isSuccess(destinationResult);

  console.log("=== Summary ===");
  console.log(`source (${SOURCE_DB_NAME}): ${sourceOk ? "PASS" : "FAIL"}`);
  console.log(
    `destination (${DESTINATION_DB_NAME}): ${destinationOk ? "PASS" : "FAIL"}`
  );
  console.log(
    `source privilege assessment: ${sourceResult.privilegeConsistency.toUpperCase()}`
  );
  console.log(
    `destination privilege assessment: ${destinationResult.privilegeConsistency.toUpperCase()}`
  );

  if (!sourceOk || !destinationOk) {
    console.error("");
    console.error(
      "Verification failed. No writes were attempted. Fix credentials/roles and re-run."
    );
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log(
    "Verification passed for authentication, expected roles, and read-only collection listing."
  );
  console.log(
    "Privilege consistency is based on connectionStatus metadata only; write access and write denial were not experimentally proven."
  );
}

main().catch(() => {
  console.error(safeErrorMessage("unexpected"));
  process.exitCode = 1;
});
