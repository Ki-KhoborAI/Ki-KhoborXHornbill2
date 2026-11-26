"use client";

import Image from "next/image";
import { useState } from "react";
import type { EventCategory } from "../../data/eventCategories";
import { IconArrowLeft } from "../icons";
import KiKhoborConversation from "../KiKhoborConversation";
import SiteHeader from "../SiteHeader";

const BOTTOM_NAV_HEIGHT = 64;

export default function EventsCategoryClient({
  category,
}: {
  category: EventCategory;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <main
      className="fixed inset-x-0 top-0 flex flex-col overflow-hidden bg-[#0b0b0b] text-white"
      style={{
        height: "100dvh",
        paddingBottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <div className="z-20 shrink-0 bg-[#0b0b0b]">
        <SiteHeader
          rightLabel={
            <>
              <IconArrowLeft className="h-3.5 w-3.5" />
              Events
            </>
          }
          rightHref="/events"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#0b0b0b] pb-24">
        <div className="mx-auto max-w-5xl px-5 pb-8 sm:px-8">
          <section className="pt-3 sm:pt-5">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
              <div className="relative flex min-h-[200px] items-end overflow-hidden p-6 sm:min-h-[300px] sm:p-9">
                {category.image && !imageFailed ? (
                  <Image
                    src={category.image}
                    alt=""
                    width={800}
                    height={450}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={() => setImageFailed(true)}
                    priority
                    decoding="async"
                  />
                ) : (
                  <div
                    role="img"
                    aria-label={`${category.title} photograph placeholder`}
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
                    {category.heroEyebrow ?? "Festival events"}
                  </p>
                  <h1 className="text-4xl font-medium tracking-[-0.05em] sm:text-6xl">
                    {category.title}
                  </h1>
                  <p className="mt-3 text-xs text-white/65 sm:text-sm">
                    {category.heroMetadata ?? "Hornbill Festival · Nagaland"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="pt-6 sm:pt-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              {category.welcomeLabel ?? "Welcome"}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
              {category.description}
            </p>
          </section>

          {category.about && (
            <section className="pt-6 sm:pt-8">
              <h2 className="text-lg font-medium tracking-tight sm:text-xl">
                {category.aboutTitle ?? "About"}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
                {category.about}
              </p>
            </section>
          )}

          <section
            className="pt-6 sm:pt-8"
            aria-label="Ki-Khobor conversation"
          >
            <KiKhoborConversation
              key={category.slug}
              suggestions={category.suggestedQuestions}
              embedded
            />
          </section>
        </div>
      </div>
    </main>
  );
}
