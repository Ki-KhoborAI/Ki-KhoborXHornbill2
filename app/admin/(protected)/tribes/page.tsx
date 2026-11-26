import { Suspense } from "react";
import { connection } from "next/server";
import {
  listAdminTribes,
  type AdminTribeRecord,
} from "../../../../lib/admin/tribes";
import TribesListClient from "./TribesListClient";

export default function AdminTribesPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-white/50">Loading tribes…</p>}
    >
      <TribesPageContent />
    </Suspense>
  );
}

async function TribesPageContent() {
  await connection();

  let tribes: AdminTribeRecord[] = [];
  let loadError: string | null = null;

  try {
    tribes = await listAdminTribes();
  } catch (error) {
    console.error(
      "[AdminTribes] Failed to list tribes:",
      error instanceof Error ? error.message : error
    );
    loadError = "Unable to load tribes from the configured database.";
  }

  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
        Module
      </p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">Tribes</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
        Open a tribe to Save, Review, Publish, Archive, or Delete from one page.
        New tribes start as draft — use All or Draft to find them, then Publish.
      </p>

      {loadError ? (
        <p className="mt-6 text-sm text-red-300" role="alert">
          {loadError}
        </p>
      ) : (
        <TribesListClient tribes={tribes} />
      )}
    </section>
  );
}
