/**
 * One-time controlled copy: kikhobor (production) → kikhobor_dev (development).
 *
 * Safety:
 * - Source database is always "kikhobor" (read-only operations only).
 * - Destination database is always "kikhobor_dev".
 * - Dry-run is the default. Pass --execute to perform inserts.
 * - Never updates or deletes on either database.
 * - Never overwrites existing destination documents (conflict → abort).
 * - Preserves original _id values and all document fields as-is.
 *
 * Credentials (mandatory, fail-closed):
 * - MONGODB_URI_READONLY — required for reading production (no shared fallback)
 * - MONGODB_URI_DEV — required for writing development (no shared fallback)
 * - Shared MONGODB_URI is never used by this script
 *
 * Usage:
 *   npx tsx scripts/copy-prod-to-dev.ts
 *   npx tsx scripts/copy-prod-to-dev.ts --execute
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { MongoClient, type Document, type WithId } from "mongodb";
import {
  DESTINATION_DB_NAME,
  SOURCE_DB_NAME,
  resolveMigrationConnections,
} from "./copy-prod-to-dev.connections";

const COLLECTIONS = ["tribes", "knowledge_items"] as const;

type CollectionName = (typeof COLLECTIONS)[number];

type CollectionPlan = {
  collection: CollectionName;
  sourceCount: number;
  destinationCount: number;
  conflictIds: string[];
  wouldInsert: number;
  sourceStatusCounts: Record<string, number>;
};

function countStatuses(docs: WithId<Document>[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const doc of docs) {
    const key =
      typeof doc.status === "string" && doc.status.trim()
        ? doc.status
        : "__missing__";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function parseArgs(argv: string[]): { execute: boolean } {
  const execute = argv.includes("--execute");
  const unknown = argv.filter(
    (arg) => arg.startsWith("-") && arg !== "--execute"
  );
  if (unknown.length > 0) {
    throw new Error(`Unknown argument(s): ${unknown.join(", ")}`);
  }
  return { execute };
}

function redactUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = "***";
    if (parsed.username) parsed.username = "***";
    return parsed.toString();
  } catch {
    return "[unparseable-uri]";
  }
}

function assertFixedDatabaseNames(): void {
  // Hard refusal if someone tries to override via env into the wrong targets.
  const configured = process.env.MONGODB_DB_NAME?.trim();
  if (configured && configured !== DESTINATION_DB_NAME) {
    console.warn(
      `[warn] MONGODB_DB_NAME=${configured} is ignored by this script. Destination is fixed to "${DESTINATION_DB_NAME}".`
    );
  }
}

async function loadCollectionDocs(
  client: MongoClient,
  dbName: string,
  collection: CollectionName
): Promise<WithId<Document>[]> {
  return client.db(dbName).collection(collection).find({}).toArray();
}

async function planCollection(
  sourceClient: MongoClient,
  destClient: MongoClient,
  collection: CollectionName
): Promise<{
  plan: CollectionPlan;
  sourceDocs: WithId<Document>[];
}> {
  const sourceDocs = await loadCollectionDocs(
    sourceClient,
    SOURCE_DB_NAME,
    collection
  );
  const destDocs = await loadCollectionDocs(
    destClient,
    DESTINATION_DB_NAME,
    collection
  );

  const destIdSet = new Set(destDocs.map((doc) => String(doc._id)));
  const conflictIds: string[] = [];

  for (const doc of sourceDocs) {
    const id = String(doc._id);
    if (destIdSet.has(id)) conflictIds.push(id);
  }

  return {
    sourceDocs,
    plan: {
      collection,
      sourceCount: sourceDocs.length,
      destinationCount: destDocs.length,
      conflictIds,
      wouldInsert: sourceDocs.length - conflictIds.length,
      sourceStatusCounts: countStatuses(sourceDocs),
    },
  };
}

async function main(): Promise<void> {
  const { execute } = parseArgs(process.argv.slice(2));
  assertFixedDatabaseNames();

  // Fail closed on credentials before any MongoClient is constructed.
  const connections = resolveMigrationConnections(process.env);
  const sourceUri = connections.sourceUri;
  const destUri = connections.destinationUri;

  console.log("=== Ki-Khobor one-time production → development copy ===");
  console.log(`Mode: ${execute ? "EXECUTE (writes enabled)" : "DRY-RUN (no writes)"}`);
  console.log(`Source DB: ${SOURCE_DB_NAME}`);
  console.log(`Destination DB: ${DESTINATION_DB_NAME}`);
  console.log(`Collections: ${COLLECTIONS.join(", ")}`);
  console.log(`Source URI: ${redactUri(sourceUri)}`);
  console.log(`Destination URI: ${redactUri(destUri)}`);
  console.log("");

  const sourceClient = new MongoClient(sourceUri, {
    serverSelectionTimeoutMS: 10000,
  });
  const destClient =
    sourceUri === destUri
      ? sourceClient
      : new MongoClient(destUri, { serverSelectionTimeoutMS: 10000 });

  let wroteAnything = false;

  try {
    await sourceClient.connect();
    if (destClient !== sourceClient) {
      await destClient.connect();
    }

    // Verify database names exist as intended by operating only on fixed names.
    const sourceDb = sourceClient.db(SOURCE_DB_NAME);
    const destDb = destClient.db(DESTINATION_DB_NAME);
    await sourceDb.command({ ping: 1 });
    await destDb.command({ ping: 1 });

    const plans: CollectionPlan[] = [];
    const payloads = new Map<CollectionName, WithId<Document>[]>();
    let hasConflicts = false;
    let hasUnexpectedDestinationData = false;

    for (const collection of COLLECTIONS) {
      const { plan, sourceDocs } = await planCollection(
        sourceClient,
        destClient,
        collection
      );
      plans.push(plan);
      payloads.set(collection, sourceDocs);

      console.log(`--- ${collection} ---`);
      console.log(`Source count: ${plan.sourceCount}`);
      console.log(`Destination count: ${plan.destinationCount}`);
      console.log(`Conflicts (same _id already in destination): ${plan.conflictIds.length}`);
      if (plan.conflictIds.length > 0) {
        hasConflicts = true;
        console.log(
          `Conflict _id sample: ${plan.conflictIds.slice(0, 5).join(", ")}${
            plan.conflictIds.length > 5 ? " …" : ""
          }`
        );
      }
      if (plan.destinationCount > 0) {
        hasUnexpectedDestinationData = true;
        console.log(
          "Destination already contains documents. Policy: never overwrite; abort if conflicts or unexpected data."
        );
      }
      console.log(`Would insert: ${plan.wouldInsert}`);
      console.log(
        `Source status census: ${JSON.stringify(plan.sourceStatusCounts)}`
      );
      console.log("");
    }

    if (hasConflicts || hasUnexpectedDestinationData) {
      console.error(
        "ABORT: Destination is not empty and/or conflicting _id values were detected."
      );
      console.error(
        "No documents were written. Clear or reconcile kikhobor_dev, then re-run dry-run."
      );
      process.exitCode = 2;
      return;
    }

    const totalWouldInsert = plans.reduce((sum, p) => sum + p.wouldInsert, 0);
    console.log(`Total documents that would be inserted: ${totalWouldInsert}`);

    if (!execute) {
      console.log("");
      console.log("DRY-RUN complete. No writes were performed.");
      console.log(
        "To perform the copy after review/approval, re-run with --execute."
      );
      console.log(
        "Execution mode will insertMany into kikhobor_dev only, preserving source _id and all fields, without updates/deletes on either database."
      );
      return;
    }

    console.log("");
    console.log("EXECUTE mode: inserting into destination only…");

    for (const collection of COLLECTIONS) {
      const docs = payloads.get(collection) ?? [];
      if (docs.length === 0) {
        console.log(`${collection}: nothing to insert`);
        continue;
      }

      // Re-check destination emptiness immediately before write (TOCTOU guard).
      const currentDestCount = await destDb
        .collection(collection)
        .countDocuments({});
      if (currentDestCount > 0) {
        throw new Error(
          `Refusing write: ${DESTINATION_DB_NAME}.${collection} is no longer empty (count=${currentDestCount}).`
        );
      }

      // insertMany with original _id values. ordered:true stops on first error.
      const result = await destDb.collection(collection).insertMany(docs, {
        ordered: true,
      });
      wroteAnything = true;
      console.log(
        `${collection}: inserted ${result.insertedCount} document(s)`
      );
    }

    // Post-write verification counts
    console.log("");
    console.log("=== Post-copy verification ===");
    for (const collection of COLLECTIONS) {
      const sourceCount = await sourceDb
        .collection(collection)
        .countDocuments({});
      const destCount = await destDb.collection(collection).countDocuments({});
      console.log(
        `${collection}: source=${sourceCount} destination=${destCount} match=${
          sourceCount === destCount
        }`
      );
    }

    console.log("");
    console.log(
      "EXECUTE complete. Production was not modified (inserts only on kikhobor_dev)."
    );
    if (wroteAnything) {
      console.log(
        "Reminder: copied drafts remain drafts; nothing was auto-published."
      );
    }
  } finally {
    await sourceClient.close();
    if (destClient !== sourceClient) {
      await destClient.close();
    }
  }
}

main().catch((error) => {
  console.error(
    "Migration failed:",
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});
