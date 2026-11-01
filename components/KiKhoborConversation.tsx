"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Location } from "../data/locations";
import {
  createAskRequestContext,
  logAskRequestContext,
  type AskRequestContext,
} from "../lib/askContext";
import { searchKnowledge } from "../lib/knowledgeSearch";

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

type Props = {
  location?: Location;
  suggestions: string[];
  embedded?: boolean;
};

export default function KiKhoborConversation({
  location,
  suggestions,
  embedded = false,
}: Props) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length === 0) return;
    const frame = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages]);

  const askQuestion = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;

    const requestContext = createAskRequestContext(trimmed, location);
    logAskRequestContext(requestContext);
    setMessages((previous) => [
      ...previous,
      { role: "user", text: trimmed, requestContext },
      { role: "assistant", text: "Searching Hornbill & Nagaland knowledge...", isSearching: true },
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
      if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
      const data = await response.json();
      setMessages((previous) => [
        ...previous.filter((message) => !message.isSearching),
        {
          role: "assistant",
          text: data.answer,
          title: data.title,
          category: data.category,
          source: data.source,
          relatedItems: data.relatedItems,
        },
      ]);
    } catch (error) {
      console.warn("[KiKhoborConversation] Remote search failed, falling back to local dataset:", error);
      const result = searchKnowledge(trimmed, location?.id ?? null, location?.tribeName ?? null);
      setMessages((previous) => [
        ...previous.filter((message) => !message.isSearching),
        {
          role: "assistant",
          text: result.answer,
          title: result.title,
          category: result.category,
          source: result.source,
          relatedItems: result.relatedItems,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, location]);

  return (
    <>
      <section
        aria-label="Conversation"
        className={`px-4 py-5 sm:px-6 ${embedded ? "pb-28" : "min-h-0 flex-1 overflow-y-auto overscroll-contain"}`}
      >
        <div className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <div>
              {!embedded && <p className="mb-3 text-xs font-medium text-neutral-400">Suggested questions</p>}
              {embedded ? (
                <div className="flex flex-wrap gap-2">
                  {suggestions.slice(0, 3).map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => askQuestion(suggestion)} className="min-h-11 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-left text-xs leading-5 text-neutral-200 transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white">{suggestion}</button>
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#090909]">
                  {suggestions.map((suggestion, index) => (
                    <button key={suggestion} type="button" onClick={() => askQuestion(suggestion)} className={`group flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.05] ${index !== suggestions.length - 1 ? "border-b border-white/[0.08]" : ""}`}>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-neutral-200 group-hover:text-white">{suggestion}</span><span className="mt-1 block text-xs text-neutral-500">{suggestion}</span></span>
                      <span aria-hidden="true" className="text-base text-neutral-500 transition group-hover:translate-x-0.5 group-hover:text-white">↗</span>
                    </button>
                  ))}
                </div>
              )}
              {!embedded && (
                <p className="mt-3 text-xs text-neutral-600">
                  Or type your own question below (e.g., festivals, Morungs, Dzukou Valley, traditional crafts).
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <article key={`${index}-${message.role}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  {message.role === "user" ? (
                    <div className="max-w-[90%] rounded-3xl rounded-br-md border border-white/10 bg-[#222222] px-4 py-3 sm:max-w-[80%]">
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white">{message.text}</p>
                    </div>
                  ) : message.isSearching ? (
                    <div className="flex items-center gap-3 py-2 text-xs text-neutral-400" aria-live="polite">
                      <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" /></span>
                      <span>Searching festival &amp; cultural knowledge...</span>
                    </div>
                  ) : message.role === "assistant" ? (
                    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111110] p-4 sm:p-5" aria-live="polite">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        {message.category && <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">{message.category}</span>}
                        {message.source && <span className="text-[10px] text-neutral-500">Source: {message.source.split(",")[0]}</span>}
                      </div>
                      {message.title && <h2 className="mb-2 text-base font-semibold tracking-tight text-white">{message.title}</h2>}
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{message.text}</div>
                      {!!message.relatedItems?.length && (
                        <div className="mt-4 border-t border-white/[0.08] pt-3">
                          <p className="mb-2 text-[11px] font-medium text-neutral-400">Related topics:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.relatedItems.slice(0, 3).map((related) => (
                              <button key={related.id} type="button" onClick={() => askQuestion(related.title)} disabled={isLoading} className="min-h-10 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs text-neutral-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-50">{related.title} ↗</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : <p className="border-l border-white/15 py-1 pl-3 text-xs leading-6 text-neutral-500">{message.text}</p>}
                </article>
              ))}
              <div ref={bottomRef} aria-hidden="true" className="h-1" />
            </div>
          )}
        </div>
      </section>

      <footer className={`z-20 shrink-0 border-t border-white/[0.08] bg-black px-3 pt-1.5 sm:px-6 ${embedded ? "fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] pb-1" : "pb-1"}`}>
        <div className="mx-auto w-full max-w-3xl">
          <form onSubmit={(event) => { event.preventDefault(); void askQuestion(question); }} className="flex items-center gap-3 rounded-[26px] border border-white/[0.15] bg-[#171717] px-1 py-0.5 pl-4 transition-colors focus-within:border-white/30">
            <input ref={inputRef} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={location ? `Ask about ${location.name}...` : "Ask anything about Nagaland or Hornbill..."} aria-label="Your question" autoComplete="off" disabled={isLoading} className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500 disabled:opacity-50" />
            <button type="submit" aria-label="Send question" disabled={!question.trim() || isLoading} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-[#333333] disabled:text-neutral-600">↑</button>
          </form>
          <p className="mt-0.5 text-center text-[9px] leading-[10px] text-neutral-600">Ki-Khobor · Your digital festival companion</p>
        </div>
      </footer>
    </>
  );
}
