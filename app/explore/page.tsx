import Link from "next/link";
import { exploreCategories } from "../../data/exploreCategories";
import { locations } from "../../data/locations";
import DiscoveryCard from "../../components/DiscoveryCard";
import SiteHeader from "../../components/SiteHeader";

export const instant = false;

type ExplorePageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

const categoryHref = (id: string) => `/explore?category=${id}`;

function TopicCard({
  eyebrow,
  title,
  description,
  href,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-56 flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.07] sm:p-7"
    >
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
          {eyebrow}
        </p>
        <h3 className="mt-5 text-2xl font-medium tracking-[-0.04em] text-white sm:text-3xl">
          {title}
        </h3>
        <p className="mt-3 max-w-md text-sm leading-6 text-white/55">
          {description}
        </p>
      </div>
      <span className="mt-8 inline-flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs text-white/65 transition group-hover:text-white">
        {action}<span aria-hidden="true" className="text-base">↗</span>
      </span>
    </Link>
  );
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { category: categoryParam } = await searchParams;
  const categoryId = Array.isArray(categoryParam) ? undefined : categoryParam;
  const selectedCategory = exploreCategories.find(
    (category) => category.id === categoryId
  );
  const morungs = Object.values(locations);
  const placesCategory = exploreCategories.find(
    (category) => category.id === "adventure-trekking"
  );
  const natureCategory = exploreCategories.find(
    (category) => category.id === "flora-nature"
  );
  const craftCategory = exploreCategories.find(
    (category) => category.id === "handicrafts-handlooms"
  );
  const infoCategory = exploreCategories.find(
    (category) => category.id === "nagaland-basics"
  );

  return (
    <main className="min-h-screen bg-[#080808] pb-[calc(144px+env(safe-area-inset-bottom))] text-white">
      <SiteHeader
        rightLabel={selectedCategory ? "← Explore" : "← Home"}
        rightHref={selectedCategory ? "/explore" : "/"}
      />

      {selectedCategory ? (
        <section className="mx-auto min-h-[70vh] max-w-6xl px-5 py-16 sm:px-10 sm:py-24">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">
            Explore · Information status
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-medium leading-tight tracking-[-0.06em] sm:text-6xl">
            {selectedCategory.name}
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
            Visitor information for this topic is still being reviewed against
            its source material.
          </p>
          <div className="mt-10 max-w-2xl rounded-3xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl sm:p-8">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-white/55">
              Content under review
            </span>
            <h2 className="mt-5 text-xl font-medium tracking-tight">
              More verified information coming soon
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/50">
              We’ll publish this guide when the available source information
              has been checked for visitors.
            </p>
            <Link
              href="/explore"
              className="mt-7 inline-flex items-center gap-2 text-sm text-white/80 transition hover:text-white"
            >
              Back to Explore <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="mx-auto max-w-6xl px-5 pb-12 pt-12 sm:px-10 sm:pb-16 sm:pt-20">
            <div className="max-w-3xl">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">
                The festival, up close
              </p>
              <h1 className="mt-5 text-5xl font-medium leading-[0.98] tracking-[-0.07em] sm:text-7xl lg:text-8xl">
                Find your way
                <br />
                <span className="text-white/45">into the story.</span>
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
                Explore the Morungs and discover what visitor information is
                currently available.
              </p>
            </div>

            <div className="mt-12 flex items-end justify-between gap-4 border-b border-white/15 pb-5 sm:mt-16">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                  The heart of Explore
                </p>
                <h2 className="mt-3 text-3xl font-medium tracking-[-0.05em] sm:text-5xl">
                  17 Morungs
                </h2>
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
                  badge={`${String(index + 1).padStart(2, "0")} / 17`}
                  eyebrow={`${place.tribeName} tribe`}
                  title={place.name}
                  note="Visitor guide in preparation"
                />
              ))}
            </div>
          </section>

          <section className="border-t border-white/10 bg-[#0b0b0b] px-5 py-14 sm:px-10 sm:py-20">
            <div className="mx-auto max-w-6xl">
              <div className="mb-8 max-w-2xl sm:mb-10">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                  More to discover
                </p>
                <h2 className="mt-3 text-3xl font-medium tracking-[-0.05em] sm:text-5xl">
                  Make the day yours.
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TopicCard
                  eyebrow="Festival guide · Preview"
                  title="Events & Activities"
                  description="Open the current festival guide preview. A verified day-by-day schedule is not available yet."
                  href="/events"
                  action="View festival guide"
                />
                <TopicCard
                  eyebrow="Discover · Under review"
                  title="Places to Explore"
                  description="Explore the available topic guides. Place recommendations are being reviewed before publication."
                  href={placesCategory ? categoryHref(placesCategory.id) : "/explore"}
                  action="View topic status"
                />
                <TopicCard
                  eyebrow="Culture · Under review"
                  title="Food & Handicrafts"
                  description="Handicraft and handloom information is being checked against its source material."
                  href={craftCategory ? categoryHref(craftCategory.id) : "/explore"}
                  action="View topic status"
                />
                <TopicCard
                  eyebrow="Visitor essentials · Under review"
                  title="Useful Information"
                  description="Practical visitor guidance will appear here after its source information has been verified."
                  href={infoCategory ? categoryHref(infoCategory.id) : "/explore"}
                  action="View topic status"
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Link
                  href={natureCategory ? categoryHref(natureCategory.id) : "/explore"}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 px-5 py-4 text-sm text-white/65 transition hover:border-white/25 hover:text-white"
                >
                  Flora & Nature <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
                </Link>
                <Link
                  href={categoryHref("festival-overview")}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 px-5 py-4 text-sm text-white/65 transition hover:border-white/25 hover:text-white"
                >
                  Festival Overview <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      <div className="fixed inset-x-0 bottom-[calc(70px+env(safe-area-inset-bottom))] z-20 px-4 sm:bottom-6 sm:px-6">
        <Link
          href="/ask"
          className="mx-auto flex max-w-xl items-center justify-between gap-4 rounded-full border border-white/15 bg-[#1b1b1b]/85 px-5 py-3.5 shadow-[0_12px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition hover:border-white/30 hover:bg-[#242424]/90"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm text-black" aria-hidden="true">✳</span>
            <span className="truncate text-sm text-white/80">Ask Ki-Khobor</span>
          </span>
          <span className="shrink-0 text-xs text-white/45">Ask anything <span aria-hidden="true">↗</span></span>
        </Link>
      </div>
    </main>
  );
}
