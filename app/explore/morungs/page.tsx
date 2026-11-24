import Link from "next/link";
import DiscoveryCard from "../../../components/DiscoveryCard";
import { locations, targetMorungCount } from "../../../data/locations";

export const instant = false;

export default function ExploreMorungsPage() {
  const morungs = Object.values(locations);

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
            href="/explore"
            className="text-xs text-white/60 transition hover:text-white"
          >
            ← Explore
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-12 pt-6 sm:px-8 sm:pb-16 sm:pt-8">
        <div className="flex items-end justify-between gap-4 border-b border-white/15 pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
              Explore · Morungs
            </p>
            <h1 className="mt-3 text-3xl font-medium tracking-[-0.05em] sm:text-5xl">
              {targetMorungCount} Morungs
            </h1>
          </div>
          <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-white/55">
            {morungs.length} locations
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {morungs.map((place, index) => (
            <DiscoveryCard
              key={place.id}
              href={`/experience/${place.id}`}
              ariaLabel={`Open ${place.name} experience`}
              image={place.image}
              imageName={place.name}
              imageTribeName={place.tribeName}
              badge={`${String(index + 1).padStart(2, "0")} / ${targetMorungCount}`}
              eyebrow={
                place.tribeName
                  ? `${place.tribeName} tribe`
                  : place.category || "Morung"
              }
              title={place.name}
              note="Visitor guide in preparation"
            />
          ))}
        </div>
      </section>
    </main>
  );
}
