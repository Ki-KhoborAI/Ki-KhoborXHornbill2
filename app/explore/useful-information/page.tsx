import Link from "next/link";
import { IconArrowLeft } from "../../../components/icons";

export const instant = false;

export default function UsefulInformationPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] pb-[calc(64px+env(safe-area-inset-bottom))] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3.5 sm:px-8 sm:py-5">
          <Link href="/" className="text-xs font-semibold tracking-[0.12em]">
            KI-KHOBOR <span className="text-white/50">×</span> HORNBILL
            <span className="mt-1 block text-[9px] font-normal uppercase tracking-[0.2em] text-white/45">
              Ask. Know. Do.
            </span>
          </Link>
          <Link
            href="/explore/food-handicrafts"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 transition hover:text-white"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            Food &amp; Handicrafts
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
          Visitor essentials
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-[-0.04em] sm:text-4xl">
          Useful Information
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/55">
          Practical visitor information related to food, handicrafts and
          cultural discoveries will appear here once it has been verified.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#151515] p-6 sm:p-8">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-white/55">
            Content in preparation
          </span>
          <h2 className="mt-5 text-xl font-medium tracking-tight">
            More verified information coming soon
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/50">
            This page is reserved for checked visitor guidance. No unverified
            details are published here yet.
          </p>
        </div>
      </section>
    </main>
  );
}
