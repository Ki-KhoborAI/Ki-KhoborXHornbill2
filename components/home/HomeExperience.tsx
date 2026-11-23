import FestivalBackground from "./FestivalBackground";
import FestivalSchedule from "./FestivalSchedule";
import HomeAskBar from "./HomeAskBar";
import Link from "next/link";

export default function HomeExperience() {
  return (
    <main className="relative text-white">
      <FestivalBackground />

      <section className="relative flex min-h-[100svh] flex-col px-5 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-5 sm:px-10 sm:pt-7">
        <header className="flex items-start justify-between gap-4">
          <Link href="/" className="min-w-0">
            <span className="block text-[11px] font-semibold tracking-[0.16em]">
              KI-KHOBOR <span className="text-white/55">×</span> HORNBILL
            </span>
            <span className="mt-1 block text-[9px] uppercase tracking-[0.22em] text-white/55">
              Ask. Know. Do.
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-white/90 motion-safe:animate-pulse"
              />
              Coming soon
            </p>
            <Link
              href="/explore"
              className="hidden rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[11px] text-white/75 backdrop-blur-xl transition hover:text-white sm:inline-flex"
            >
              Explore
            </Link>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end pb-2 pt-16">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/70 motion-safe:animate-[home-rise_800ms_ease-out_both]">
            Hornbill Festival
          </p>
          <h1 className="mt-4 max-w-xl text-5xl font-medium leading-[0.98] tracking-[-0.055em] text-white drop-shadow-[0_8px_28px_rgba(0,0,0,0.45)] motion-safe:animate-[home-rise_900ms_ease-out_both] sm:text-7xl">
            There is more to every story.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/80 drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)] motion-safe:animate-[home-rise_1000ms_ease-out_both] sm:text-base sm:leading-7">
            Discover the people, places, and traditions of Nagaland with
            Ki-Khobor.
          </p>

          <div className="mt-8 motion-safe:animate-[home-rise_1100ms_ease-out_both]">
            <HomeAskBar />
          </div>

          <a
            href="#schedule"
            className="mt-6 inline-flex w-fit items-center gap-2 text-xs tracking-[0.16em] text-white/70 uppercase transition hover:text-white"
          >
            Festival schedule
            <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <FestivalSchedule />
    </main>
  );
}
