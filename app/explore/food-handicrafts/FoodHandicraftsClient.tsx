"use client";

import Image from "next/image";
import Link from "next/link";
import { IconArrowLeft } from "../../../components/icons";
import KiKhoborConversation from "../../../components/KiKhoborConversation";

const suggestions = [
  "What traditional Naga foods should I try?",
  "What are Naga shawls and their patterns?",
  "How are traditional Naga handicrafts made?",
  "Where can I find local handicrafts at the festival?",
];

/** Shared with Explore landing Food & Handicrafts card; swap later if a dedicated food/loom photo is added. */
const INTRO_IMAGE = "/images/morungs/DSC09719.webp";

export default function FoodHandicraftsClient() {
  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#0b0b0b] text-white">
      <header className="shrink-0 border-b border-white/10">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3.5 sm:px-8 sm:py-5">
          <Link href="/" className="text-xs font-semibold tracking-[0.12em]">
            KI-KHOBOR <span className="text-white/50">×</span> HORNBILL
            <span className="mt-1 block text-[9px] font-normal uppercase tracking-[0.2em] text-white/45">
              Ask. Know. Do.
            </span>
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 transition hover:text-white"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            Explore
          </Link>
        </div>
      </header>

      {/* Single scroll column (intro + chat) so new turns scroll into view like Morung pages. */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-3xl px-5 pb-8 pt-5 sm:px-8 sm:pt-6">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
            <div className="relative flex min-h-[180px] items-end overflow-hidden p-6 sm:min-h-[240px] sm:p-8">
              <Image
                src={INTRO_IMAGE}
                alt="Festival gathering highlighting Naga food and cultural crafts"
                width={1200}
                height={700}
                className="absolute inset-0 h-full w-full object-cover"
                priority
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent"
              />
              <div className="relative z-10">
                <p className="text-[9px] uppercase tracking-[0.25em] text-white/70">
                  Explore · Culture
                </p>
              </div>
            </div>
          </div>

          <h1 className="mt-6 text-2xl font-medium tracking-tight sm:text-3xl">
            Food &amp; Handicrafts
          </h1>
          <p className="mt-2.5 max-w-xl text-sm leading-6 text-white/55">
            Discover traditional Naga food, handicrafts, textiles and cultural
            practices with Ki-Khobor.
          </p>

          <KiKhoborConversation
            embedded
            suggestions={suggestions}
            suggestionsHeading="You could explore"
            placeholder="Ask about Naga food and handicrafts…"
            askInputId="food-handicrafts-ask"
          />
        </div>
      </div>

      <div
        aria-hidden="true"
        className="h-[calc(64px+env(safe-area-inset-bottom))] shrink-0 bg-[#0b0b0b]"
      />
    </main>
  );
}
