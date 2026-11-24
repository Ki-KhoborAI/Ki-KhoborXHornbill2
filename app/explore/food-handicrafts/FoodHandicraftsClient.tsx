"use client";

import Link from "next/link";
import KiKhoborConversation from "../../../components/KiKhoborConversation";

const suggestions = [
  "What traditional Naga foods should I try?",
  "What are Naga shawls and their patterns?",
  "How are traditional Naga handicrafts made?",
  "Where can I find local handicrafts at the festival?",
];

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
            className="text-xs text-white/60 transition hover:text-white"
          >
            ← Explore
          </Link>
        </div>
      </header>

      <div className="shrink-0 px-5 pt-5 sm:px-8 sm:pt-6">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
            Food &amp; Handicrafts
          </h1>
          <p className="mt-2.5 max-w-xl text-sm leading-6 text-white/55">
            Discover traditional Naga food, handicrafts, textiles and cultural
            practices with Ki-Khobor.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <KiKhoborConversation
          suggestions={suggestions}
          suggestionsHeading="You could explore"
          placeholder="Ask about Naga food and handicrafts…"
          askInputId="food-handicrafts-ask"
        />
      </div>

      <div
        aria-hidden="true"
        className="h-[calc(64px+env(safe-area-inset-bottom))] shrink-0 bg-[#0b0b0b]"
      />
    </main>
  );
}
