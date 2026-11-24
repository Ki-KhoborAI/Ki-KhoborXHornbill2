"use client";

import { useSearchParams } from "next/navigation";
import { locations } from "../../data/locations";
import KiKhoborConversation from "../../components/KiKhoborConversation";
import SiteHeader from "../../components/SiteHeader";

const suggestions = [
  "What is the Hornbill Festival?",
  "Tell me about the different Naga tribes and their cultures.",
  "What can I discover at Kisama Heritage Village?",
];

export default function AskClient() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get("location");
  const initialQuestion = searchParams.get("question") ?? undefined;
  const location = locationId ? locations[locationId.toLowerCase()] : undefined;
  const contextualQuestions = location?.questions?.filter((item) => item !== "Explore other Morungs");
  const visibleSuggestions = contextualQuestions?.length ? contextualQuestions : suggestions;

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-black text-white">
      <div className="shrink-0 bg-black">
        <SiteHeader rightLabel="ONLINE" />
        <div className="px-4 pb-3 pt-3 sm:px-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Ask Ki-Khobor</h1>
          <p className="mt-1 text-xs text-neutral-400 sm:text-sm">Instant answers on Hornbill Festival, 18 Naga tribes, Kisama &amp; Nagaland.</p>
        </div>
        {location && <div className="px-4 pb-2 text-xs text-neutral-400 sm:px-6">Exploring: <span className="font-medium text-white">{location.name}</span></div>}
      </div>
      <KiKhoborConversation
        location={location}
        suggestions={visibleSuggestions}
        initialQuestion={initialQuestion}
      />
      <div aria-hidden="true" className="h-[calc(64px+env(safe-area-inset-bottom))] shrink-0 bg-black" />
    </main>
  );
}
