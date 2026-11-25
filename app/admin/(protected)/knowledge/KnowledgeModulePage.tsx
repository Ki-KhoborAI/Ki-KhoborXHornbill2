import { Suspense } from "react";
import { connection } from "next/server";
import { listAdminKnowledge } from "../../../../lib/admin/knowledge";
import type { AdminKnowledgeRecord } from "../../../../lib/admin/knowledge";
import KnowledgeListClient from "./KnowledgeListClient";
import type { KnowledgeModuleConfig } from "./knowledgeTypes";

export default function KnowledgeModulePage({
  config,
}: {
  config: KnowledgeModuleConfig;
}) {
  return (
    <Suspense
      fallback={<p className="text-sm text-white/50">Loading items…</p>}
    >
      <KnowledgeModuleContent config={config} />
    </Suspense>
  );
}

async function KnowledgeModuleContent({
  config,
}: {
  config: KnowledgeModuleConfig;
}) {
  await connection();

  let items: AdminKnowledgeRecord[] = [];
  let loadError: string | null = null;

  try {
    items = await listAdminKnowledge({
      category: config.lockedCategory,
    });
  } catch (error) {
    console.error(
      `[Admin${config.title}] Failed to list items:`,
      error instanceof Error ? error.message : error
    );
    loadError = "Unable to load items from the configured database.";
  }

  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
        Module
      </p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">{config.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
        {config.description}
      </p>

      {loadError ? (
        <p className="mt-6 text-sm text-red-300" role="alert">
          {loadError}
        </p>
      ) : (
        <KnowledgeListClient items={items} config={config} />
      )}
    </section>
  );
}
