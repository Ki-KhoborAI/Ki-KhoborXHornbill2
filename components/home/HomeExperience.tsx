import FestivalBackground from "./FestivalBackground";
import FestivalSchedule from "./FestivalSchedule";
import HomeAskBar from "./HomeAskBar";
import Link from "next/link";

export default function HomeExperience() {
  return (
    <main
      className="flex flex-col overflow-hidden bg-[#0b0b0b] text-white"
      style={{
        height: "100dvh",
        paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <header className="shrink-0 border-b border-white/10">
        <div className="mx-auto flex w-full max-w-5xl items-center px-5 py-3.5 sm:px-8 sm:py-5">
          <Link href="/" className="min-w-0 text-xs font-semibold tracking-[0.12em]">
            KI-KHOBOR <span className="text-white/50">×</span> HORNBILL
            <span className="mt-1 block text-[9px] font-normal uppercase tracking-[0.2em] text-white/45">
              Ask. Know. Do.
            </span>
          </Link>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-5 pb-3 sm:px-8 sm:pb-4">
        <div className="shrink-0 pt-3 sm:pt-5">
          <FestivalBackground />
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 sm:mt-5 sm:gap-5">
          <div className="shrink-0">
            <HomeAskBar />
          </div>

          <FestivalSchedule />
        </div>
      </div>
    </main>
  );
}
