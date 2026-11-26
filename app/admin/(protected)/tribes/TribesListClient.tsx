"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  OFFICIAL_NAGA_TRIBE_COUNT,
  OFFICIAL_NON_NAGA_INDIGENOUS_TRIBE_COUNT,
  classifyTribeSlug,
  tribeClassificationLabel,
  type TribeClassification,
} from "../../../../lib/tribesData";
import {
  TRIBE_STATUS_LABELS,
  type AdminTribeRecord,
  type AdminTribeStatus,
} from "./tribeTypes";

type ListFilter = "all" | "official_naga" | "recognised_non_naga_indigenous" | AdminTribeStatus;

const FILTERS: Array<{ value: ListFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "official_naga", label: "Official Naga" },
  {
    value: "recognised_non_naga_indigenous",
    label: "Non-Naga indigenous",
  },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "verified", label: "Verified" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

function tribeKind(tribe: AdminTribeRecord): TribeClassification {
  return classifyTribeSlug(tribe.slug);
}

export default function TribesListClient({
  tribes,
}: {
  tribes: AdminTribeRecord[];
}) {
  const [filter, setFilter] = useState<ListFilter>("all");

  const counts = useMemo(() => {
    const next: Record<ListFilter, number> = {
      all: tribes.length,
      official_naga: 0,
      recognised_non_naga_indigenous: 0,
      draft: 0,
      in_review: 0,
      verified: 0,
      published: 0,
      archived: 0,
    };
    for (const tribe of tribes) {
      next[tribe.status] += 1;
      const kind = tribeKind(tribe);
      if (kind === "official_naga") next.official_naga += 1;
      if (kind === "recognised_non_naga_indigenous") {
        next.recognised_non_naga_indigenous += 1;
      }
    }
    return next;
  }, [tribes]);

  const visible = useMemo(() => {
    if (filter === "all") return tribes;
    if (filter === "official_naga" || filter === "recognised_non_naga_indigenous") {
      return tribes.filter((tribe) => tribeKind(tribe) === filter);
    }
    return tribes.filter((tribe) => tribe.status === filter);
  }, [filter, tribes]);

  const grouped =
    filter === "all"
      ? {
          official_naga: visible.filter(
            (tribe) => tribeKind(tribe) === "official_naga"
          ),
          recognised_non_naga_indigenous: visible.filter(
            (tribe) => tribeKind(tribe) === "recognised_non_naga_indigenous"
          ),
          other: visible.filter((tribe) => tribeKind(tribe) === "other"),
        }
      : null;

  return (
    <div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
            Official Naga Tribes
          </p>
          <p className="mt-1 text-2xl font-medium tracking-tight">
            {OFFICIAL_NAGA_TRIBE_COUNT}
          </p>
          <p className="mt-1 text-xs text-white/45">
            In catalogue: {counts.official_naga}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
            Recognised Non-Naga Indigenous
          </p>
          <p className="mt-1 text-2xl font-medium tracking-tight">
            {OFFICIAL_NON_NAGA_INDIGENOUS_TRIBE_COUNT}
          </p>
          <p className="mt-1 text-xs text-white/45">
            In catalogue: {counts.recognised_non_naga_indigenous}
          </p>
        </div>
      </div>

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
        ) : grouped ? (
          <div className="divide-y divide-white/10">
            <TribeGroup
              title={`Official Naga Tribes (${OFFICIAL_NAGA_TRIBE_COUNT} recognised)`}
              tribes={grouped.official_naga}
            />
            <TribeGroup
              title={`Recognised Non-Naga Indigenous Tribes (${OFFICIAL_NON_NAGA_INDIGENOUS_TRIBE_COUNT} recognised)`}
              tribes={grouped.recognised_non_naga_indigenous}
            />
            {grouped.other.length > 0 ? (
              <TribeGroup title="Other catalogue records" tribes={grouped.other} />
            ) : null}
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {visible.map((tribe) => (
              <TribeRow key={tribe.id} tribe={tribe} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TribeGroup({
  title,
  tribes,
}: {
  title: string;
  tribes: AdminTribeRecord[];
}) {
  return (
    <div>
      <div className="border-b border-white/5 px-5 py-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
          {title}
        </p>
        <p className="mt-1 text-xs text-white/35">
          {tribes.length === 0
            ? "None in catalogue yet"
            : `${tribes.length} in catalogue`}
        </p>
      </div>
      {tribes.length === 0 ? (
        <p className="px-5 py-4 text-sm text-white/40">No matching records.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {tribes.map((tribe) => (
            <TribeRow key={tribe.id} tribe={tribe} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TribeRow({ tribe }: { tribe: AdminTribeRecord }) {
  const kind = tribeKind(tribe);
  return (
    <li>
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
            {tribe.regionOrDistricts ? ` · ${tribe.regionOrDistricts}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
            {tribeClassificationLabel(kind)}
          </span>
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60">
            {TRIBE_STATUS_LABELS[tribe.status]}
          </span>
        </div>
      </Link>
    </li>
  );
}
