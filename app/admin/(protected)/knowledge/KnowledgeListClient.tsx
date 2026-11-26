"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  STATUS_LABELS,
  type AdminContentStatus,
  type AdminKnowledgeRecord,
  type KnowledgeCategory,
  type KnowledgeModuleConfig,
} from "./knowledgeTypes";

const STATUS_FILTERS: Array<{
  value: "all" | AdminContentStatus;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "verified", label: "Verified" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function KnowledgeListClient({
  items,
  config,
}: {
  items: AdminKnowledgeRecord[];
  config: KnowledgeModuleConfig;
}) {
  const [statusFilter, setStatusFilter] = useState<"all" | AdminContentStatus>(
    "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | KnowledgeCategory
  >(config.lockedCategory ?? "all");

  const statusCounts = useMemo(() => {
    const next: Record<"all" | AdminContentStatus, number> = {
      all: items.length,
      draft: 0,
      in_review: 0,
      verified: 0,
      published: 0,
      archived: 0,
    };
    for (const item of items) {
      next[item.status] += 1;
    }
    return next;
  }, [items]);

  const visible = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [categoryFilter, items, statusFilter]);

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((item) => {
            const active = statusFilter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatusFilter(item.value)}
                className={
                  active
                    ? "rounded-full bg-white px-3 py-1.5 text-xs text-black"
                    : "rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/65 hover:border-white/30 hover:text-white"
                }
              >
                {item.label} ({statusCounts[item.value]})
              </button>
            );
          })}
        </div>
        <Link
          href={`${config.basePath}/new`}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
        >
          {config.newLabel}
        </Link>
      </div>

      {!config.lockedCategory ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={
              categoryFilter === "all"
                ? "rounded-full bg-white/15 px-3 py-1.5 text-xs text-white"
                : "rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55 hover:border-white/25 hover:text-white"
            }
          >
            All categories
          </button>
          {ALL_CATEGORIES.map((category) => {
            const active = categoryFilter === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={
                  active
                    ? "rounded-full bg-white/15 px-3 py-1.5 text-xs text-white"
                    : "rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55 hover:border-white/25 hover:text-white"
                }
              >
                {CATEGORY_LABELS[category]}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
        {visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-white/50">
            No items match this filter.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {visible.map((item) => (
              <li key={item.id}>
                <Link
                  href={`${config.basePath}/${encodeURIComponent(item.slug)}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium tracking-tight">
                      {item.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-white/40">
                      {CATEGORY_LABELS[item.category]} · {item.slug}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
                    {STATUS_LABELS[item.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
