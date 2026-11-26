"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  TRIBE_STATUS_LABELS,
  type AdminTribeRecord,
  type AdminTribeStatus,
} from "./tribeTypes";

const FILTERS: Array<{ value: "all" | AdminTribeStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "verified", label: "Verified" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function TribesListClient({
  tribes,
}: {
  tribes: AdminTribeRecord[];
}) {
  const [filter, setFilter] = useState<"all" | AdminTribeStatus>("all");

  const counts = useMemo(() => {
    const next: Record<"all" | AdminTribeStatus, number> = {
      all: tribes.length,
      draft: 0,
      in_review: 0,
      verified: 0,
      published: 0,
      archived: 0,
    };
    for (const tribe of tribes) {
      next[tribe.status] += 1;
    }
    return next;
  }, [tribes]);

  const visible = useMemo(() => {
    if (filter === "all") return tribes;
    return tribes.filter((tribe) => tribe.status === filter);
  }, [filter, tribes]);

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const active = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={
                  active
                    ? "rounded-full bg-white px-3 py-1.5 text-xs text-black"
                    : "rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/65 hover:border-white/30 hover:text-white"
                }
              >
                {item.label} ({counts[item.value]})
              </button>
            );
          })}
        </div>
        <Link
          href="/admin/tribes/new"
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
        >
          New tribe
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
        {visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-white/50">
            {tribes.length === 0
              ? "No tribes yet. Create one to get started."
              : `No tribes in “${FILTERS.find((item) => item.value === filter)?.label ?? filter}”. New tribes appear under All / Draft until you advance their status.`}
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {visible.map((tribe) => (
              <li key={tribe.id}>
                <Link
                  href={`/admin/tribes/${encodeURIComponent(tribe.slug)}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium tracking-tight">
                      {tribe.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-white/40">
                      {tribe.slug}
                      {tribe.regionOrDistricts
                        ? ` · ${tribe.regionOrDistricts}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
                    {TRIBE_STATUS_LABELS[tribe.status]}
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
