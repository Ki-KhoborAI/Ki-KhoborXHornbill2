import Link from "next/link";

export default function UpdatesPage() {
  return (
    <main className="min-h-screen bg-[#080808] pb-[calc(64px+env(safe-area-inset-bottom))] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-6 sm:px-10">
        <Link href="/" className="text-xs font-semibold tracking-[0.12em]">
          KI-KHOBOR <span className="text-white/50">×</span> HORNBILL
          <span className="mt-1 block text-[9px] font-normal uppercase tracking-[0.2em] text-white/45">
            Ask. Know. Do.
          </span>
        </Link>

        <Link
          href="/explore"
          className="text-xs text-white/60 transition hover:text-white"
        >
          Explore ↗
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-10 sm:py-24">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">
          Festival guide
        </p>

        <h1 className="mt-5 max-w-3xl text-4xl font-medium leading-tight tracking-[-0.06em] sm:text-6xl">
          Updates
        </h1>

        <p className="mt-6 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
          Verified festival announcements and updates will appear here when
          available.
        </p>

        <div className="mt-12 border-t border-white/15 pt-8">
          <div className="border border-white/15 p-6 sm:p-8">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">
              NOTICE
            </p>

            <h2 className="mt-3 text-xl font-medium tracking-tight sm:text-2xl">
              No announcements published yet
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">
              Official notices and verified visitor updates for the Hornbill
              Festival will be posted on this page as they are confirmed. In
              the meantime, continue exploring the Morungs and stories of
              Kisama.
            </p>

            <Link
              href="/explore"
              className="mt-6 inline-flex items-center gap-3 border border-white/20 px-4 py-2.5 text-xs text-white/85 transition hover:border-white/50 hover:text-white"
            >
              Explore Morungs <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}