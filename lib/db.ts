import dns from "node:dns";
import dnsPromises from "node:dns/promises";
import { MongoClient, type Db } from "mongodb";
import dotenv from "dotenv";

// Load environment variables (.env.local first, then .env)
dotenv.config({ path: ".env.local" });
dotenv.config();

const DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];

// Configure reliable DNS servers for MongoDB Atlas SRV resolution
// Must be configured on both callback dns and dns.promises, since mongodb driver uses dns.promises[api]
export function applyDnsConfiguration() {
  try {
    dns.setServers(DNS_SERVERS);
  } catch (err) {
    console.warn("[lib/db.ts] dns.setServers error:", err);
  }
  try {
    dnsPromises.setServers(DNS_SERVERS);
  } catch (err) {
    console.warn("[lib/db.ts] dnsPromises.setServers error:", err);
  }
}

// Apply immediately on module evaluation
applyDnsConfiguration();

const uri = process.env.MONGODB_URI;

interface MongoGlobal {
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoClientInstance?: MongoClient;
}

const globalWithMongo = globalThis as typeof globalThis & MongoGlobal;

function getClientPromise(): Promise<MongoClient> {
  // Ensure DNS is configured before connection
  applyDnsConfiguration();

  if (process.env.NODE_ENV === "development") {
    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri || "", {
        serverSelectionTimeoutMS: 5000,
      });
      globalWithMongo._mongoClientInstance = client;
      globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
        // Clear cached promise on failure so Next.js fast-refresh or retry can re-attempt
        globalWithMongo._mongoClientPromise = undefined;
        globalWithMongo._mongoClientInstance = undefined;
        throw err;
      });
    }
    return globalWithMongo._mongoClientPromise;
  }

  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(uri || "", {
      serverSelectionTimeoutMS: 5000,
    });
    globalWithMongo._mongoClientInstance = client;
    globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
      // Clear cached promise on failure so future attempts can reconnect
      globalWithMongo._mongoClientPromise = undefined;
      globalWithMongo._mongoClientInstance = undefined;
      throw err;
    });
  }
  return globalWithMongo._mongoClientPromise;
}

/**
 * Returns the MongoDB Db instance for 'kikhobor'.
 */
export async function getDatabase(dbName = "kikhobor"): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}

/**
 * Connect to database with optional URI (useful for CLI scripts)
 */
export async function connectToDatabase(customUri?: string, dbName = "kikhobor"): Promise<Db> {
  applyDnsConfiguration();
  if (customUri && customUri !== uri) {
    const customClient = new MongoClient(customUri, { serverSelectionTimeoutMS: 5000 });
    await customClient.connect();
    return customClient.db(dbName);
  }
  return getDatabase(dbName);
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (globalWithMongo._mongoClientInstance) {
    await globalWithMongo._mongoClientInstance.close();
    globalWithMongo._mongoClientPromise = undefined;
    globalWithMongo._mongoClientInstance = undefined;
  }
}

export default getClientPromise;
