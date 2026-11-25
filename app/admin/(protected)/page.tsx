export default function AdminDashboardPage() {
  return (
    <section>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
        Dashboard
      </p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight">
        Admin authenticated
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
        Authentication is active. Content management modules (tribes, knowledge
        base, festival, morungs) will be added in later phases. No production
        data can be modified from this placeholder.
      </p>
    </section>
  );
}
