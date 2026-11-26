import Link from "next/link";
import { IconArrowUpRight } from "../../components/icons";
import SiteHeader from "../../components/SiteHeader";

export default function UpdatesPage() {
  return (
    <main className="min-h-screen bg-[#080808] pb-[calc(64px+env(safe-area-inset-bottom))] text-white">
      <SiteHeader
        rightLabel={
          <>
            Explore
            <IconArrowUpRight className="h-3.5 w-3.5" />
          </>
        }
        rightHref="/explore"
      />

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
              Explore Morungs{" "}
              <IconArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
