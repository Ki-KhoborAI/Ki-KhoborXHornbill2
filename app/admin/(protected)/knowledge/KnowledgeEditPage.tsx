import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import {
  AdminKnowledgeError,
  getAdminKnowledgeBySlug,
} from "../../../../lib/admin/knowledge";
import KnowledgeEditor from "./KnowledgeEditor";
import type { KnowledgeModuleConfig } from "./knowledgeTypes";

export default function KnowledgeEditPage({
  config,
  params,
}: {
  config: KnowledgeModuleConfig;
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading item…</p>}>
      <KnowledgeEditContent config={config} params={params} />
    </Suspense>
  );
}

async function KnowledgeEditContent({
  config,
  params,
}: {
  config: KnowledgeModuleConfig;
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;

  let item;
  try {
    item = await getAdminKnowledgeBySlug(decodeURIComponent(slug), {
      expectedCategory: config.lockedCategory,
    });
  } catch (error) {
    if (error instanceof AdminKnowledgeError && error.code === "not_found") {
      notFound();
    }
    console.error(
      `[Admin${config.title}] Failed to load item:`,
      error instanceof Error ? error.message : error
    );
    return (
      <section>
        <h1 className="text-2xl font-medium tracking-tight">{config.title}</h1>
        <p className="mt-4 text-sm text-red-300" role="alert">
          Unable to load this item from the configured database.
        </p>
        <Link
          href={config.basePath}
          className="mt-4 inline-block text-sm text-white/70 underline-offset-4 hover:underline"
        >
          Back to list
        </Link>
      </section>
    );
  }

  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
        {config.title}
      </p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">{item.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
        Edit fields and status for{" "}
        <span className="text-white/85">{item.slug}</span>. Permanent delete is
        limited to draft or archived records. Existing imported attributes are
        preserved.
      </p>
      <KnowledgeEditor mode="edit" config={config} initialItem={item} />
    </section>
  );
}
