import { Suspense } from "react";
import Link from "next/link";
import {
  getAdminDashboardStats,
  type AdminDashboardStats,
  type AdminStatusBreakdown,
} from "../../../lib/admin/stats";

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-white/50">Loading overview statistics…</p>
      }
    >
      <DashboardOverview />
    </Suspense>
  );
}

async function DashboardOverview() {
  let stats: AdminDashboardStats | null = null;
  let loadError: string | null = null;

  try {
    stats = await getAdminDashboardStats();
  } catch (error) {
    console.error(
      "[AdminDashboard] Failed to load stats:",
      error instanceof Error ? error.message : error
    );
    loadError = "Unable to load statistics from the configured database.";
  }

  if (loadError || !stats) {
    return (
      <section>
        <Header />
        <p className="mt-6 text-sm text-red-300" role="alert">
          {loadError ?? "Unable to load statistics."}
        </p>
      </section>
    );
  }

  const cards = [
    {
      label: "Tribes",
      value: stats.tribes.total,
      href: "/admin/tribes",
      detail: "All tribe records",
    },
    {
      label: "Knowledge items",
      value: stats.knowledgeItems.total,
      href: "/admin/knowledge",
      detail: "Full knowledge base",
    },
    {
      label: "Festivals",
      value: stats.festivals.total,
      href: "/admin/festivals",
      detail: "festival_overview",
    },
    {
      label: "Morungs",
      value: stats.morungs.total,
      href: "/admin/morungs",
      detail: "morungs_overview",
    },
  ];

  return (
    <section>
      <Header />
      <p className="mt-2 text-xs text-white/40">
        Database: <span className="text-white/60">{stats.database}</span>
        {" · "}
        Counts are live reads. Empty collections show zero.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-white/10 bg-[#151515] px-5 py-4 transition-colors hover:border-white/25"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-medium tracking-tight tabular-nums">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-white/45">{card.detail}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <StatusPanel title="Tribe status" breakdown={stats.tribes.byStatus} />
        <StatusPanel
          title="Knowledge status"
          breakdown={stats.knowledgeItems.byStatus}
        />
      </div>
    </section>
  );
}

function Header() {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
        Dashboard
      </p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">Overview</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
        Content inventory for the configured development database. Management
        modules will unlock create and edit flows in later phases.
      </p>
    </div>
  );
}

function StatusPanel({
  title,
  breakdown,
}: {
  title: string;
  breakdown: AdminStatusBreakdown;
}) {
  const rows: Array<{ key: keyof AdminStatusBreakdown; label: string }> = [
    { key: "draft", label: "Draft" },
    { key: "in_review", label: "In review" },
    { key: "verified", label: "Verified" },
    { key: "published", label: "Published" },
    { key: "archived", label: "Archived" },
    { key: "missing", label: "Missing status" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151515] px-5 py-5">
      <h2 className="text-sm font-medium tracking-tight">{title}</h2>
      <dl className="mt-4 space-y-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between border-b border-white/5 py-2 text-sm last:border-b-0"
          >
            <dt className="text-white/55">{row.label}</dt>
            <dd className="tabular-nums text-white/90">{breakdown[row.key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
