"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { locations } from "../../data/locations";
import KiKhoborConversation from "../../components/KiKhoborConversation";
import SiteHeader from "../../components/SiteHeader";

const suggestions = [
  "What is the Hornbill Festival?",
  "Tell me about the different Naga tribes and their cultures.",
  "What can I discover at Kisama Heritage Village?",
];

const INTRO_VARIATIONS = [
  "Step inside the Festival of Festivals. From the 18 tribal Morungs at Kisama to live arena schedules, Naga delicacies, and crafts—ask anything and explore like an insider.",
  "Ten days of rhythm, heritage, and stories across 18 Naga tribes. Ask about Morung traditions, daily Kisama events, local food, or visitor tips—instant answers in your pocket.",
  "Your pocket companion for Kisama Heritage Village. Discover the stories behind all 18 Morungs, traditional attire, authentic Naga dishes, and what is happening right now.",
  "Wondering which Morung to visit next or what traditional dish to try at Kisama? Ask anything about Naga heritage, festival timings, and local crafts.",
  "From log-drum beats and ancestral Morungs to fiery Naga cuisine and handwoven shawls—ask Ki-Khobor to guide your Hornbill Festival experience.",
] as const;

const INTRO_STORAGE_KEY = "ki-khobor-ask-intro-index";

function pickFreshIntroIndex(previous: number | null): number {
  const count = INTRO_VARIATIONS.length;
  if (count <= 1) return 0;

  if (previous === null || !Number.isFinite(previous)) {
    // First visit after SSR paint of variation 1 — prefer a different index.
    return 1 + Math.floor(Math.random() * (count - 1));
  }

  let next = Math.floor(Math.random() * count);
  // Avoid repeating the last visit's intro when possible.
  if (next === previous) {
    next = (previous + 1) % count;
  }
  return next;
}

export default function AskClient() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get("location");
  const initialQuestion = searchParams.get("question") ?? undefined;
  const location = locationId ? locations[locationId.toLowerCase()] : undefined;
  const contextualQuestions = location?.questions?.filter(
    (item) => item !== "Explore other Morungs"
  );
  const visibleSuggestions = contextualQuestions?.length
    ? contextualQuestions
    : suggestions;

  // Variation 1 on SSR / first paint to avoid hydration mismatch.
  const [introIndex, setIntroIndex] = useState(0);
  const [conversationActive, setConversationActive] = useState(
    Boolean(initialQuestion?.trim())
  );

  useEffect(() => {
    // Defer so the first client paint matches SSR (variation 1), then swap
    // to a visit-fresh intro without a hydration mismatch.
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(INTRO_STORAGE_KEY);
        const previous =
          raw === null || raw === "" ? null : Number.parseInt(raw, 10);
        const next = pickFreshIntroIndex(
          Number.isFinite(previous) ? previous : null
        );
        sessionStorage.setItem(INTRO_STORAGE_KEY, String(next));
        setIntroIndex(next);
      } catch {
        // sessionStorage unavailable — keep SSR variation 1.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleConversationActiveChange = useCallback((active: boolean) => {
    setConversationActive(active);
  }, []);

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#0b0b0b] text-white">
      <div className="shrink-0 bg-[#0b0b0b]">
        <SiteHeader rightLabel="ONLINE" />
        {!conversationActive ? (
          <div className="px-4 pb-3 pt-3 sm:px-6">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Ask Ki-Khobor
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-neutral-400 sm:text-sm sm:leading-6">
              {INTRO_VARIATIONS[introIndex]}
            </p>
            {location ? (
              <p className="mt-2 text-xs text-neutral-400">
                Exploring:{" "}
                <span className="font-medium text-white">{location.name}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <KiKhoborConversation
        location={location}
        suggestions={visibleSuggestions}
        initialQuestion={initialQuestion}
        placeholder="Ask anything…"
        askInputId="global-ask"
        onConversationActiveChange={handleConversationActiveChange}
      />
      <div
        aria-hidden="true"
        className="h-[calc(64px+env(safe-area-inset-bottom))] shrink-0 bg-[#0b0b0b]"
      />
    </main>
  );
}
