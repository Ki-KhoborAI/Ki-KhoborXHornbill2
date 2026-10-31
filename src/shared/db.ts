import dns from 'node:dns';
import { MongoClient, type Db } from 'mongodb';
import { AppError } from './errors.js';

// Configure reliable DNS servers for SRV record resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in environments where setting DNS servers is restricted
}

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connect to MongoDB once on server start.
 * Reuses the existing connection if already established.
 * Does NOT connect on import.
 *
 * @param uri - MongoDB Atlas connection string
 * @param dbName - Optional database name (uses default database from URI if omitted)
 */
export async function connectToDatabase(uri: string, dbName?: string): Promise<Db> {
  if (db && client) {
    return db;
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    return db;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database connection error';
    throw new AppError(`Failed to connect to MongoDB: ${message}`, 500, 'DB_CONNECTION_ERROR');
  }
}

/**
 * Retrieve the active database instance.
 * Throws an error if called before connectToDatabase().
 */
export function getDb(): Db {
  if (!db) {
    throw new AppError('Database not initialized. Call connectToDatabase() first.', 500, 'DB_NOT_INITIALIZED');
  }
  return db;
}

/**
 * Retrieve the active MongoClient instance.
 * Throws an error if called before connectToDatabase().
 */
export function getClient(): MongoClient {
  if (!client) {
    throw new AppError('MongoClient not initialized. Call connectToDatabase() first.', 500, 'DB_NOT_INITIALIZED');
  }
  return client;
}

/**
 * Gracefully close the MongoDB connection.
 * Used during server shutdown.
 */
export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
