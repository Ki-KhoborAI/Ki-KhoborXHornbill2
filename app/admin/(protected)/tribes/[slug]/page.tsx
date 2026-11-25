import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import {
  AdminTribeError,
  getAdminTribeBySlug,
} from "../../../../../lib/admin/tribes";
import TribeEditor from "../TribeEditor";

export default function AdminEditTribePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-sm text-white/50">Loading tribe…</p>}
    >
      <EditTribeContent params={params} />
    </Suspense>
  );
}

async function EditTribeContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;

  let tribe;
  try {
    tribe = await getAdminTribeBySlug(decodeURIComponent(slug));
  } catch (error) {
    if (error instanceof AdminTribeError && error.code === "not_found") {
      notFound();
    }
    console.error(
      "[AdminTribes] Failed to load tribe:",
      error instanceof Error ? error.message : error
    );
    return (
      <section>
        <h1 className="text-2xl font-medium tracking-tight">Tribe</h1>
        <p className="mt-4 text-sm text-red-300" role="alert">
          Unable to load this tribe from the configured database.
        </p>
        <Link
          href="/admin/tribes"
          className="mt-4 inline-block text-sm text-white/70 underline-offset-4 hover:underline"
        >
          Back to tribes
        </Link>
      </section>
    );
  }

  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
        Tribes
      </p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">{tribe.name}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
        Edit fields and status for <span className="text-white/85">{tribe.slug}</span>
        . Permanent delete is limited to draft or archived records.
      </p>
      <TribeEditor mode="edit" initialTribe={tribe} />
    </section>
  );
}
