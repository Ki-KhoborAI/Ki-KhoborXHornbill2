import DiscoveryCard from "../../components/DiscoveryCard";
import SiteHeader from "../../components/SiteHeader";
import { eventCategories } from "../../data/eventCategories";

export default function EventsPage() {
  const categories = Object.values(eventCategories);

  return (
    <main className="min-h-screen bg-[#080808] pb-[calc(64px+env(safe-area-inset-bottom))] text-white">
      <SiteHeader rightLabel="Explore places ↗" rightHref="/explore" />

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-10 sm:pb-24 sm:pt-20">
        <div className="max-w-3xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/45">
            Ki-Khobor × Hornbill Festival
          </p>
          <h1 className="mt-5 text-5xl font-medium leading-[0.98] tracking-[-0.065em] sm:text-7xl">
            Explore Events
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
            Discover what&apos;s happening at Hornbill Festival.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => (
            <DiscoveryCard
              key={category.slug}
              href={`/events/${category.slug}`}
              ariaLabel={`Explore ${category.title}`}
              image={category.image}
              imageName="Hornbill Festival"
              badge={`${String(index + 1).padStart(2, "0")} / 04`}
              eyebrow="Festival events"
              title={category.title}
              note={category.cardDescription ?? "Information in progress"}
              imageOverlay
            />
          ))}
        </div>

        <p className="mt-8 max-w-2xl text-xs leading-6 text-white/40">
          Event details are being added as verified information becomes
          available. Ask Ki-Khobor on each category page about information it
          currently has.
        </p>
      </section>
    </main>
  );
}
