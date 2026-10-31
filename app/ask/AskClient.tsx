"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { locations } from "../../data/locations";
import {
  createAskRequestContext,
  logAskRequestContext,
  type AskRequestContext,
} from "../../lib/askContext";
import { searchKnowledge } from "../../lib/knowledgeSearch";

const suggestions = [
  {
    title: "The Hornbill Festival",
    question: "What is the Hornbill Festival?",
  },
  {
    title: "Naga tribes and culture",
    question: "Tell me about the different Naga tribes and their cultures.",
  },
  {
    title: "Discover Kisama",
    question: "What can I discover at Kisama Heritage Village?",
  },
];

type Message = {
  role: "user" | "assistant" | "notice";
  text: string;
  title?: string;
  category?: string;
  source?: string | null;
  relatedItems?: Array<{ id: string; title: string; category: string }>;
  isSearching?: boolean;
  requestContext?: AskRequestContext;
};

export default function AskClient() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get("location");
  const location = locationId
    ? locations[locationId.toLowerCase()]
    : undefined;
  const contextualQuestions = location?.questions
    ?.filter((item) => item !== "Explore other Morungs")
    .filter((item): item is string => typeof item === "string");
  const visibleSuggestions = contextualQuestions?.length
    ? contextualQuestions.map((question) => ({ title: question, question }))
    : suggestions;

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length === 0) return;

    const frame = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [messages]);

  const askQuestion = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isLoading) return;

      const requestContext = createAskRequestContext(trimmed, location);
      logAskRequestContext(requestContext);

      // Add user message and temporary searching indicator
      setMessages((previous) => [
        ...previous,
        { role: "user", text: trimmed, requestContext },
        {
          role: "assistant",
          text: "Searching Hornbill & Nagaland knowledge...",
          isSearching: true,
        },
      ]);

      setQuestion("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: trimmed,
            activeLocationId: location?.id ?? null,
            activeTribe: location?.tribeName ?? null,
          }),
        });

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();

        setMessages((previous) => [
          ...previous.filter((m) => !m.isSearching),
          {
            role: "assistant",
            text: data.answer,
            title: data.title,
            category: data.category,
            source: data.source,
            relatedItems: data.relatedItems,
          },
        ]);
      } catch (err) {
        console.warn("[AskClient] Remote search failed, falling back to local dataset:", err);
        // Fallback to client-side bundled knowledge base
        const localResult = searchKnowledge(
          trimmed,
          location?.id ?? null,
          location?.tribeName ?? null
        );

        setMessages((previous) => [
          ...previous.filter((m) => !m.isSearching),
          {
            role: "assistant",
            text: localResult.answer,
            title: localResult.title,
            category: localResult.category,
            source: localResult.source,
            relatedItems: localResult.relatedItems,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [location, isLoading]
  );

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-black text-white">
      {/* Compact header */}
      <header className="shrink-0 border-b border-white/[0.08] bg-black px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-[11px] font-medium tracking-[0.12em] text-neutral-400 transition hover:text-white"
          >
            KI-KHOBOR <span className="text-neutral-600">×</span> HORNBILL
          </Link>

          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-400">
            ONLINE
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Ask Ki-Khobor
            </h1>
            <p className="mt-1 text-xs text-neutral-400 sm:text-sm">
              Instant answers on Hornbill Festival, 18 Naga tribes, Kisama & Nagaland.
            </p>
          </div>
        </div>

        {location && (
          <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
            Exploring: <span className="text-white font-medium">{location.name}</span>
          </div>
        )}
      </header>

      {/* Scrollable chat area */}
      <section
        aria-label="Conversation"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <div>
              <p className="mb-3 text-xs font-medium text-neutral-400">
                Suggested questions
              </p>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#090909]">
                {visibleSuggestions.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => askQuestion(item.question)}
                    className={`group flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.05] ${
                      index !== visibleSuggestions.length - 1
                        ? "border-b border-white/[0.08]"
                        : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-neutral-200 group-hover:text-white">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs text-neutral-500">
                        {item.question}
                      </span>
                    </span>

                    <span
                      aria-hidden="true"
                      className="text-base text-neutral-500 transition group-hover:translate-x-0.5 group-hover:text-white"
                    >
                      ↗
                    </span>
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs text-neutral-600">
                Or type your own question below (e.g., festivals, Morungs, Dzukou Valley, traditional crafts).
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <article
                  key={`${index}-${message.role}`}
                  className={
                    message.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  {message.role === "user" ? (
                    <div className="max-w-[90%] rounded-3xl rounded-br-md bg-[#222222] border border-white/10 px-4 py-3 sm:max-w-[80%]">
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white">
                        {message.text}
                      </p>
                    </div>
                  ) : message.isSearching ? (
                    <div className="flex items-center gap-3 py-2 text-neutral-400 text-xs" aria-live="polite">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      <span>Searching festival & cultural knowledge...</span>
                    </div>
                  ) : message.role === "assistant" ? (
                    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111110] p-4 sm:p-5" aria-live="polite">
                      {/* Category Badge & Title */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        {message.category && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider text-amber-300">
                            {message.category}
                          </span>
                        )}
                        {message.source && (
                          <span className="text-[10px] text-neutral-500">
                            Source: {message.source.split(",")[0]}
                          </span>
                        )}
                      </div>

                      {message.title && (
                        <h2 className="text-base font-semibold text-white mb-2 tracking-tight">
                          {message.title}
                        </h2>
                      )}

                      {/* Main Answer Content */}
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">
                        {message.text}
                      </div>

                      {/* Related Questions Pills */}
                      {message.relatedItems && message.relatedItems.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/[0.08]">
                          <p className="text-[11px] font-medium text-neutral-400 mb-2">
                            Related topics:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.relatedItems.map((rel) => (
                              <button
                                key={rel.id}
                                type="button"
                                onClick={() => askQuestion(rel.title)}
                                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-neutral-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white text-left"
                              >
                                {rel.title} ↗
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full max-w-2xl py-1" aria-live="polite">
                      <p className="border-l border-white/15 pl-3 text-xs leading-6 text-neutral-500">
                        {message.text}
                      </p>
                    </div>
                  )}
                </article>
              ))}

              <div ref={bottomRef} aria-hidden="true" className="h-1" />
            </div>
          )}
        </div>
      </section>

      {/* Fixed composer above the bottom navigation */}
      <footer className="z-20 shrink-0 border-t border-white/[0.08] bg-black px-3 pb-2 pt-3 sm:px-6 sm:pb-3">
        <div className="mx-auto w-full max-w-3xl">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              askQuestion(question);
            }}
            className="flex items-center gap-3 rounded-[26px] border border-white/[0.15] bg-[#171717] p-2 pl-4 transition-colors focus-within:border-white/30"
          >
            <input
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask anything about Nagaland or Hornbill..."
              aria-label="Your question"
              autoComplete="off"
              disabled={isLoading}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500 disabled:opacity-50"
            />

            <button
              type="submit"
              aria-label="Send question"
              disabled={!question.trim() || isLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xl text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-[#333333] disabled:text-neutral-600"
            >
              ↑
            </button>
          </form>

          <p className="mt-2 text-center text-[10px] text-neutral-600">
            Ki-Khobor · Your digital festival companion
          </p>
        </div>
      </footer>

      {/* Matches the fixed BottomNav height and safe area */}
      <div
        aria-hidden="true"
        className="h-[calc(64px+env(safe-area-inset-bottom))] shrink-0 bg-black"
      />
    </main>
  );
}
