import Link from "next/link";

export default function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
        Module
      </p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
        {description}
      </p>
      <p className="mt-6 text-sm text-white/45">
        Content management for this module is not enabled yet.{" "}
        <Link href="/admin" className="text-white/80 underline-offset-4 hover:underline">
          Return to overview
        </Link>
        .
      </p>
    </section>
  );
}
