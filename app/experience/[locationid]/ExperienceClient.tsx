
"use client";

import Image from "next/image";
import { locations } from "../../../data/locations";
import KiKhoborConversation from "../../../components/KiKhoborConversation";
import SiteHeader from "../../../components/SiteHeader";

const BOTTOM_NAV_HEIGHT = 64;

type ExperienceClientProps = {
  locationId: string;
};

export default function ExperienceClient({
  locationId,
}: ExperienceClientProps) {
  const id = locationId.toLowerCase();
  const location = locations[id];

  if (!location) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0b0b] px-6 pb-[calc(64px+env(safe-area-inset-bottom))] text-white">
        <div className="max-w-md">
          <p className="text-xs tracking-[0.2em] text-white/50">
            KI-KHOBOR × HORNBILL
          </p>

          <h1 className="mt-5 text-3xl font-medium">
            Location not found
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/60">
            We couldn&apos;t find this location. Check the URL and try again.
          </p>

          <p className="mt-4 text-xs text-white/30">
            Requested location: {id || "none"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="fixed inset-x-0 top-0 flex flex-col overflow-hidden bg-[#0b0b0b] text-white"
      style={{
        height: "100dvh",
        paddingBottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <div className="z-20 shrink-0 bg-[#0b0b0b]">
        <SiteHeader rightLabel="Festival guide" />
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#0b0b0b] pb-24">
        <div className="mx-auto max-w-5xl px-5 pb-8 sm:px-8">
          <section className="pt-3 sm:pt-5">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
              <div className="relative flex min-h-[200px] items-end overflow-hidden p-6 sm:min-h-[300px] sm:p-9">
                {location.image ? (
                  <Image
                    src={location.image}
                    alt={`${location.name} photograph`}
                    width={1200}
                    height={700}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div
                    role="img"
                    aria-label={`${location.name} photograph placeholder`}
                    className="absolute inset-0 flex items-center justify-center bg-[#181818]"
                  >
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/35">
                      Photograph coming soon
                    </span>
                  </div>
                )}

                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
                />

                <div className="relative z-10">
                  <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-white/60">
                    {location.category || "MORUNG EXPERIENCE"}
                  </p>

                  <h1 className="text-4xl font-medium tracking-[-0.05em] sm:text-6xl">
                    {location.name}
                  </h1>

                  {location.tribeName && (
                    <p className="mt-2 text-xs text-white/60 sm:text-sm">
                      Associated tribe: {location.tribeName}
                    </p>
                  )}

                  <p className="mt-3 text-xs text-white/65 sm:text-sm">
                    Kisama Heritage Village · Nagaland
                  </p>
                </div>
              </div>

            </div>
          </section>

          {location.tribeIntroduction && location.tribeName && (
            <section className="pt-6 sm:pt-8" aria-labelledby="tribe-introduction-heading">
              <p
                id="tribe-introduction-heading"
                className="text-[10px] uppercase tracking-[0.2em] text-white/40"
              >
                About the {location.tribeName}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">
                {location.tribeIntroduction}
              </p>
            </section>
          )}

          <section className="pt-6 sm:pt-8" aria-label="Ki-Khobor conversation">
            <KiKhoborConversation
              key={id}
              location={location}
              suggestions={location.questions ?? []}
              embedded
            />
          </section>
        </div>
      </div>

    </main>
  );
}
