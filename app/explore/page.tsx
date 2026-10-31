import Link from "next/link";
import { exploreCategories } from "../../data/exploreCategories";
import { locations } from "../../data/locations";

export const instant = false;

type ExplorePageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

export default async function ExplorePage({
  searchParams,
}: ExplorePageProps) {
  const { category: categoryParam } = await searchParams;
  const categoryId = Array.isArray(categoryParam) ? undefined : categoryParam;
  const selectedCategory = exploreCategories.find(
    (category) => category.id === categoryId
  );
  const places = Object.values(locations);

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
          href={selectedCategory ? "/explore" : "/"}
          className="text-xs text-white/60 transition hover:text-white"
        >
          {selectedCategory ? "← Explore" : "← Home"}
        </Link>
      </header>

      {selectedCategory ? (
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-10 sm:py-24">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">
            Discover Nagaland
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-medium leading-tight tracking-[-0.06em] sm:text-6xl">
            {selectedCategory.name}
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
            Verified visitor information for this topic is being prepared.
            More information coming soon.
          </p>
          <div className="mt-10 max-w-2xl border border-white/15 bg-[#0d0d0d] p-6 sm:p-8">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">
              Information status
            </p>
            <h2 className="mt-3 text-lg font-medium">
              More verified information coming soon
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/50">
              This section will be updated when its source material has been
              reviewed for visitors.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-10 sm:pt-24">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">
              Your festival guide
            </p>

            <h1 className="mt-5 max-w-3xl text-4xl font-medium leading-tight tracking-[-0.06em] sm:text-6xl">
              Find a place.
              <br />
              Discover its story.
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
              Explore the Morung Houses of Kisama and browse topics across
              Nagaland. Details will appear as verified information becomes
              available.
            </p>
          </section>

          <section
            id="morung-houses"
            className="mx-auto max-w-6xl px-5 py-14 sm:px-10 sm:py-20"
          >
            <div className="flex items-end justify-between gap-4 border-b border-white/15 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                  A · Places
                </p>
                <h2 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
                  Morung Houses
                </h2>
              </div>
              <span className="text-xs text-white/40">
                {places.length} experiences
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {places.map((place) => (
                <Link
                  key={place.id}
                  href={`/experience/${place.id}`}
                  aria-label={`Open ${place.name} experience`}
                  className="group min-w-0 border border-white/15 p-4 transition hover:border-white/40 hover:bg-white/[0.025] sm:p-5"
                >
                  <div
                    role="img"
                    aria-label={`${place.name} photograph placeholder`}
                    className="flex aspect-[16/9] items-center justify-center border border-white/10 bg-[#121212]"
                  >
                    <span className="text-[9px] uppercase tracking-[0.18em] text-white/35">
                      Photograph coming soon
                    </span>
                  </div>

                  <div className="pt-5">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                      {place.category}
                    </p>
                    <h3 className="mt-3 break-words text-xl font-medium tracking-tight sm:text-2xl">
                      {place.name}
                    </h3>
                    {place.tribeName && (
                      <p className="mt-2 text-xs text-white/55">
                        {place.tribeName} tribe
                      </p>
                    )}
                    <p className="mt-3 text-sm leading-6 text-white/50">
                      {place.description || "More information coming soon."}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-3 text-xs text-white/80">
                      Open experience <span aria-hidden="true">↗</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section
            id="discover-nagaland"
            className="border-t border-white/10 bg-[#0b0b0b] px-5 py-14 sm:px-10 sm:py-20"
          >
            <div className="mx-auto max-w-6xl">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                B · Topics
              </p>
              <h2 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
                Discover Nagaland
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/50">
                Open a topic to see its current information state. Visitor
                content will be added after source review.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {exploreCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/explore?category=${category.id}`}
                    className="group flex min-h-32 flex-col justify-between border border-white/15 p-5 transition hover:border-white/40 hover:bg-white/[0.025]"
                  >
                    <h3 className="text-base font-medium text-white/90">
                      {category.name}
                    </h3>
                    <span className="mt-5 inline-flex items-center justify-between gap-3 text-xs text-white/50 group-hover:text-white/80">
                      More verified information coming soon
                      <span aria-hidden="true">↗</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
