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

type StatusCountRow = { _id: unknown; count: number };

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

function breakdownFromRows(rows: StatusCountRow[]): {
  total: number;
  byStatus: AdminStatusBreakdown;
} {
  const byStatus = emptyBreakdown();
  let total = 0;
  for (const row of rows) {
    const key = normalizeStatusKey(
      row._id === "__missing__" ? undefined : row._id
    );
    const count = typeof row.count === "number" ? row.count : 0;
    byStatus[key] += count;
    total += count;
  }
  return { total, byStatus };
}

const STATUS_GROUP_STAGE = {
  $group: {
    _id: { $ifNull: ["$status", "__missing__"] },
    count: { $sum: 1 },
  },
} as const;

/**
 * One aggregation pass — total is the sum of status buckets (no extra countDocuments).
 */
async function countByStatus(
  db: Db,
  collectionName: string,
  extraFilter: Record<string, unknown> = {}
): Promise<{ total: number; byStatus: AdminStatusBreakdown }> {
  const collection = db.collection(collectionName);
  const pipeline: Record<string, unknown>[] = [];
  if (Object.keys(extraFilter).length > 0) {
    pipeline.push({ $match: extraFilter });
  }
  pipeline.push(STATUS_GROUP_STAGE);

  const rows = await collection
    .aggregate<StatusCountRow>(pipeline)
    .toArray();

  return breakdownFromRows(rows);
}

/**
 * Single knowledge_items round-trip for all / festivals / morungs breakdowns.
 */
async function collectKnowledgeDashboardStats(db: Db): Promise<{
  knowledgeItems: { total: number; byStatus: AdminStatusBreakdown };
  festivals: { total: number; byStatus: AdminStatusBreakdown };
  morungs: { total: number; byStatus: AdminStatusBreakdown };
}> {
  const [facet] = await db
    .collection("knowledge_items")
    .aggregate<{
      all: StatusCountRow[];
      festivals: StatusCountRow[];
      morungs: StatusCountRow[];
    }>([
      {
        $facet: {
          all: [STATUS_GROUP_STAGE],
          festivals: [
            { $match: { category: "festival_overview" } },
            STATUS_GROUP_STAGE,
          ],
          morungs: [
            { $match: { category: "morungs_overview" } },
            STATUS_GROUP_STAGE,
          ],
        },
      },
    ])
    .toArray();

  return {
    knowledgeItems: breakdownFromRows(facet?.all ?? []),
    festivals: breakdownFromRows(facet?.festivals ?? []),
    morungs: breakdownFromRows(facet?.morungs ?? []),
  };
}

/**
 * Build dashboard statistics from a Db handle.
 * Read-only: aggregate only (no writes, no redundant countDocuments).
 */
export async function collectAdminDashboardStats(
  db: Db,
  databaseName: string
): Promise<AdminDashboardStats> {
  const [tribes, knowledge] = await Promise.all([
    countByStatus(db, "tribes"),
    collectKnowledgeDashboardStats(db),
  ]);

  return {
    database: databaseName,
    tribes,
    knowledgeItems: knowledge.knowledgeItems,
    festivals: {
      ...knowledge.festivals,
      category: "festival_overview",
    },
    morungs: {
      ...knowledge.morungs,
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
