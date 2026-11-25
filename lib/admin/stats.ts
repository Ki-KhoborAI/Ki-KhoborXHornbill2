import type { Db } from "mongodb";
import {
  DatabaseConfigError,
  getConfiguredDatabaseName,
  getDatabase,
} from "../db";
export type AdminStatusCountKey =
  | "draft"
  | "in_review"
  | "verified"
  | "published"
  | "archived"
  | "missing";

export type AdminStatusBreakdown = Record<AdminStatusCountKey, number>;

export type AdminDashboardStats = {
  database: string;
  tribes: {
    total: number;
    byStatus: AdminStatusBreakdown;
  };
  knowledgeItems: {
    total: number;
    byStatus: AdminStatusBreakdown;
  };
  festivals: {
    total: number;
    category: "festival_overview";
    byStatus: AdminStatusBreakdown;
  };
  morungs: {
    total: number;
    category: "morungs_overview";
    byStatus: AdminStatusBreakdown;
  };
};

function emptyBreakdown(): AdminStatusBreakdown {
  return {
    draft: 0,
    in_review: 0,
    verified: 0,
    published: 0,
    archived: 0,
    missing: 0,
  };
}

function normalizeStatusKey(raw: unknown): AdminStatusCountKey {
  if (
    raw === "draft" ||
    raw === "in_review" ||
    raw === "verified" ||
    raw === "published" ||
    raw === "archived"
  ) {
    return raw;
  }
  return "missing";
}

async function countByStatus(
  db: Db,
  collectionName: string,
  extraFilter: Record<string, unknown> = {}
): Promise<{ total: number; byStatus: AdminStatusBreakdown }> {
  const collection = db.collection(collectionName);
  const filter = { ...extraFilter };
  const total = await collection.countDocuments(filter);
  const rows = await collection
    .aggregate<{ _id: unknown; count: number }>([
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ["$status", "__missing__"] },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const byStatus = emptyBreakdown();
  for (const row of rows) {
    const key = normalizeStatusKey(
      row._id === "__missing__" ? undefined : row._id
    );
    byStatus[key] += row.count;
  }

  return { total, byStatus };
}

/**
 * Build dashboard statistics from a Db handle.
 * Read-only: countDocuments + aggregate only.
 */
export async function collectAdminDashboardStats(
  db: Db,
  databaseName: string
): Promise<AdminDashboardStats> {
  const [tribes, knowledgeItems, festivals, morungs] = await Promise.all([
    countByStatus(db, "tribes"),
    countByStatus(db, "knowledge_items"),
    countByStatus(db, "knowledge_items", { category: "festival_overview" }),
    countByStatus(db, "knowledge_items", { category: "morungs_overview" }),
  ]);

  return {
    database: databaseName,
    tribes,
    knowledgeItems,
    festivals: {
      ...festivals,
      category: "festival_overview",
    },
    morungs: {
      ...morungs,
      category: "morungs_overview",
    },
  };
}

/**
 * Load dashboard statistics from the configured application database.
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const databaseName = getConfiguredDatabaseName();
  const db = await getDatabase(databaseName);
  return collectAdminDashboardStats(db, databaseName);
}

export function emptyAdminDashboardStats(
  databaseName = "unconfigured"
): AdminDashboardStats {
  const empty = emptyBreakdown();
  return {
    database: databaseName,
    tribes: { total: 0, byStatus: { ...empty } },
    knowledgeItems: { total: 0, byStatus: { ...empty } },
    festivals: {
      total: 0,
      category: "festival_overview",
      byStatus: { ...empty },
    },
    morungs: {
      total: 0,
      category: "morungs_overview",
      byStatus: { ...empty },
    },
  };
}

export { DatabaseConfigError };
