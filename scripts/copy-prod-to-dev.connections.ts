/**
 * Fail-closed connection resolution for the one-time prod→dev copy script.
 * Shared MONGODB_URI is intentionally never used as a fallback.
 */

export const SOURCE_DB_NAME = "kikhobor" as const;
export const DESTINATION_DB_NAME = "kikhobor_dev" as const;

export class MigrationCredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationCredentialError";
  }
}

/**
 * Require a dedicated URI environment variable.
 * Empty / whitespace-only values fail closed.
 */
export function requireMandatoryUri(
  name: "MONGODB_URI_READONLY" | "MONGODB_URI_DEV",
  value: string | undefined
): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new MigrationCredentialError(
      `Missing required ${name}. Shared MONGODB_URI is not accepted as a fallback. Aborting before any database connection.`
    );
  }
  return trimmed;
}

export type MigrationConnectionPlan = {
  sourceUri: string;
  destinationUri: string;
  sourceDbName: typeof SOURCE_DB_NAME;
  destinationDbName: typeof DESTINATION_DB_NAME;
};

/**
 * Resolve migration URIs from environment.
 * Must be called before constructing MongoClient instances.
 */
export function resolveMigrationConnections(
  env: NodeJS.ProcessEnv = process.env
): MigrationConnectionPlan {
  // Hardcoded database names — never taken from MONGODB_DB_NAME / URI path.
  if (SOURCE_DB_NAME !== "kikhobor") {
    throw new MigrationCredentialError(
      "Internal safety check failed: unexpected source database name."
    );
  }
  if (DESTINATION_DB_NAME !== "kikhobor_dev") {
    throw new MigrationCredentialError(
      "Internal safety check failed: unexpected destination database name."
    );
  }

  const sourceUri = requireMandatoryUri(
    "MONGODB_URI_READONLY",
    env.MONGODB_URI_READONLY
  );
  const destinationUri = requireMandatoryUri(
    "MONGODB_URI_DEV",
    env.MONGODB_URI_DEV
  );

  return {
    sourceUri,
    destinationUri,
    sourceDbName: SOURCE_DB_NAME,
    destinationDbName: DESTINATION_DB_NAME,
  };
}
