import Link from "next/link";
import TribeEditor from "../TribeEditor";

export default function AdminNewTribePage() {
  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
        Tribes
      </p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">New tribe</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
        Create a draft tribe record. Leave fields blank rather than inventing
        missing cultural details.
      </p>
      <p className="mt-2 text-sm text-white/45">
        <Link
          href="/admin/tribes"
          className="text-white/80 underline-offset-4 hover:underline"
        >
          Back to tribes
        </Link>
      </p>
      <TribeEditor mode="create" />
    </section>
  );
}
