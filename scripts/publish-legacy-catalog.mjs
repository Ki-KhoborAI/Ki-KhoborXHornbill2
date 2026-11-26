/**
 * One-time repair: importer locked festival catalog rows to status "draft",
 * which hid them from Ask after published-only retrieval shipped.
 *
 * Publishes draft tribes/knowledge that have no admin createdBy
 * (legacy importer rows only). Does not touch admin-authored drafts.
 *
 * Usage: node scripts/publish-legacy-catalog.mjs [kikhobor|kikhobor_dev]
 */
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const dbName = process.argv[2] || "kikhobor";
if (!["kikhobor", "kikhobor_dev"].includes(dbName)) {
  console.error("DB must be kikhobor or kikhobor_dev");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const legacyDraftFilter = {
  status: "draft",
  $or: [{ createdBy: { $exists: false } }, { createdBy: null }],
};

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
await client.connect();
const db = client.db(dbName);
const now = new Date();

for (const col of ["tribes", "knowledge_items"]) {
  const before = await db.collection(col).countDocuments(legacyDraftFilter);
  const result = await db.collection(col).updateMany(legacyDraftFilter, {
    $set: { status: "published", updatedAt: now },
  });
  console.log(
    `${dbName}.${col}: matched=${before} modified=${result.modifiedCount}`
  );
}

await client.close();
console.log("Done.");
