import Link from "next/link";
import KnowledgeEditor from "./KnowledgeEditor";
import type { KnowledgeModuleConfig } from "./knowledgeTypes";

export default function KnowledgeNewPage({
  config,
}: {
  config: KnowledgeModuleConfig;
}) {
  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
        {config.title}
      </p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">
        {config.newLabel}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
        Create a draft knowledge record. Leave fields blank rather than inventing
        missing facts.
      </p>
      <p className="mt-2 text-sm text-white/45">
        <Link
          href={config.basePath}
          className="text-white/80 underline-offset-4 hover:underline"
        >
          Back to list
        </Link>
      </p>
      <KnowledgeEditor mode="create" config={config} />
    </section>
  );
}
