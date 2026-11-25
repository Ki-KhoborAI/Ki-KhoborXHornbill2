import { MongoClient, type Db } from "mongodb";
import dotenv from "dotenv";

// Load environment variables (.env.local first, then .env)
dotenv.config({ path: ".env.local" });
dotenv.config();

const uri = process.env.MONGODB_URI;

/** Production database name — never the default for local/admin development writes. */
export const PRODUCTION_DATABASE_NAME = "kikhobor";

/** Expected local/development database name on the shared Atlas cluster. */
export const DEVELOPMENT_DATABASE_NAME = "kikhobor_dev";

export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

export class DatabaseWriteGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseWriteGuardError";
  }
}

interface MongoGlobal {
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoClientInstance?: MongoClient;
}

const globalWithMongo = globalThis as typeof globalThis & MongoGlobal;

function getClientPromise(): Promise<MongoClient> {
  if (!uri?.trim()) {
    throw new DatabaseConfigError("Missing MONGODB_URI environment variable.");
  }

  if (process.env.NODE_ENV === "development") {
    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri, {
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
    const client = new MongoClient(uri, {
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
 * Validate a MongoDB database name.
 * Rejects empty, oversized, or unsafe identifiers.
 */
export function validateDatabaseName(dbName: string): string {
  const name = dbName.trim();
  if (!name) {
    throw new DatabaseConfigError("Database name is empty.");
  }
  if (name.length > 64) {
    throw new DatabaseConfigError("Database name exceeds 64 characters.");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(name)) {
    throw new DatabaseConfigError(
      "Database name may only contain letters, numbers, underscores, and hyphens."
    );
  }
  return name;
}

/**
 * Resolve the configured application database name from MONGODB_DB_NAME.
 * Fails closed when missing or invalid — never silently defaults to production.
 */
export function getConfiguredDatabaseName(): string {
  const raw = process.env.MONGODB_DB_NAME;
  if (raw === undefined || raw.trim() === "") {
    throw new DatabaseConfigError(
      "Missing MONGODB_DB_NAME environment variable."
    );
  }
  return validateDatabaseName(raw);
}

/**
 * True when the target database is the production content database.
 */
export function isProductionDatabaseName(dbName: string): boolean {
  return validateDatabaseName(dbName) === PRODUCTION_DATABASE_NAME;
}

/**
 * Server-side write guard.
 * Refuses writes to the production database outside a production runtime.
 * Does not create, copy, or modify any data by itself.
 */
export function assertDatabaseWriteAllowed(dbName?: string): void {
  const target = validateDatabaseName(
    dbName?.trim() ? dbName : getConfiguredDatabaseName()
  );

  if (
    isProductionDatabaseName(target) &&
    process.env.NODE_ENV !== "production"
  ) {
    throw new DatabaseWriteGuardError(
      `Refusing database write to production database "${PRODUCTION_DATABASE_NAME}" outside production (NODE_ENV=${process.env.NODE_ENV ?? "undefined"}). Use "${DEVELOPMENT_DATABASE_NAME}" for local development.`
    );
  }
}

/**
 * Returns the MongoDB Db instance for the configured database.
 * Optional explicit dbName overrides MONGODB_DB_NAME after validation.
 */
export async function getDatabase(dbName?: string): Promise<Db> {
  const resolved = validateDatabaseName(
    dbName?.trim() ? dbName : getConfiguredDatabaseName()
  );
  const client = await getClientPromise();
  return client.db(resolved);
}

/**
 * Connect to database with optional URI (useful for CLI scripts)
 */
export async function connectToDatabase(
  customUri?: string,
  dbName?: string
): Promise<Db> {
  const resolved = validateDatabaseName(
    dbName?.trim() ? dbName : getConfiguredDatabaseName()
  );

  if (customUri && customUri !== uri) {
    const customClient = new MongoClient(customUri, {
      serverSelectionTimeoutMS: 5000,
    });
    await customClient.connect();
    return customClient.db(resolved);
  }
  return getDatabase(resolved);
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
