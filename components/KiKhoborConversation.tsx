"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Location } from "../data/locations";
import {
  createAskRequestContext,
  logAskRequestContext,
  type AskRequestContext,
} from "../lib/askContext";
import { searchKnowledge } from "../lib/knowledgeSearch";
import AskInput from "./AskInput";
import SuggestionBubbles, {
  type SuggestionBubbleItem,
} from "./SuggestionBubbles";

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
  initialQuestion?: string;
  /** Shown above empty-state suggestion bubbles. */
  suggestionsHeading?: string;
  /** Ask input placeholder. */
  placeholder?: string;
  /** Unique id prefix for the shared Ask input. */
  askInputId?: string;
  /** Fires when conversation goes from empty ↔ has messages. */
  onConversationActiveChange?: (active: boolean) => void;
};

function toSuggestionItems(suggestions: string[]): SuggestionBubbleItem[] {
  return suggestions.map((suggestion) =>
    suggestion === "Explore other Morungs"
      ? {
          key: suggestion,
          label: suggestion,
          href: "/explore/morungs",
        }
      : { key: suggestion, label: suggestion }
  );
}

export default function KiKhoborConversation({
  location,
  suggestions,
  embedded = false,
  initialQuestion,
  suggestionsHeading,
  placeholder,
  askInputId,
  onConversationActiveChange,
}: Props) {
  const generatedId = useId();
  const inputId = askInputId ?? `ask-input-${generatedId}`;
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const askQuestionRef = useRef<(value: string) => Promise<void>>(
    async () => {}
  );
  const didAutoAsk = useRef(false);
  const conversationActive = messages.length > 0;

  useEffect(() => {
    onConversationActiveChange?.(conversationActive);
  }, [conversationActive, onConversationActiveChange]);

  const resolvedPlaceholder =
    placeholder ??
    (location
      ? "Ask about this Morung…"
      : "Ask anything about Nagaland or Hornbill…");

  const emptyHeading =
    suggestionsHeading ??
    (embedded ? undefined : "Suggested questions");

  useEffect(() => {
    if (messages.length === 0) return;
    const frame = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages]);

  const askQuestion = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isLoading) return;

      const requestContext = createAskRequestContext(trimmed, location);
      logAskRequestContext(requestContext);
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
            conversationHistory: messages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((m) => ({ role: m.role, text: m.text }))
              .slice(-4),
          }),
        });
        if (!response.ok)
          throw new Error(`API responded with status: ${response.status}`);
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
        console.warn(
          "[KiKhoborConversation] Remote search failed, falling back to local dataset:",
          error
        );
        const result = searchKnowledge(
          trimmed,
          location?.id ?? null,
          location?.tribeName ?? null
        );
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
    },
    [isLoading, location, messages]
  );

  useEffect(() => {
    askQuestionRef.current = askQuestion;
  }, [askQuestion]);

  useEffect(() => {
    const trimmed = initialQuestion?.trim();
    if (!trimmed || didAutoAsk.current) return;
    didAutoAsk.current = true;
    void askQuestionRef.current(trimmed);
  }, [initialQuestion]);

  const suggestionItems = toSuggestionItems(suggestions);
  const latestAssistant = [...messages]
    .reverse()
    .find(
      (message) =>
        message.role === "assistant" &&
        !message.isSearching &&
        (message.relatedItems?.length ?? 0) > 0
    );
  const followUpItems: SuggestionBubbleItem[] =
    latestAssistant?.relatedItems?.slice(0, 4).map((related) => ({
      key: related.id,
      label: related.title,
    })) ?? [];

  return (
    <>
      <section
        aria-label="Conversation"
        className={`px-4 pb-24 sm:px-6 ${
          conversationActive && !embedded ? "pt-4 sm:pt-5" : "pt-5"
        } ${
          embedded ? "" : "min-h-0 flex-1 overflow-y-auto overscroll-contain"
        }`}
      >
        <div className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <div>
              {emptyHeading ? (
                <p className="mb-3 text-xs font-medium text-white/45">
                  {emptyHeading}
                </p>
              ) : null}
              <SuggestionBubbles
                items={suggestionItems}
                disabled={isLoading}
                onSelect={(label) => void askQuestion(label)}
              />
            </div>
          ) : (
            <div className="space-y-5">
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
                    <div className="max-w-[90%] rounded-3xl rounded-br-md bg-white/[0.1] px-4 py-3 sm:max-w-[80%]">
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white">
                        {message.text}
                      </p>
                    </div>
                  ) : message.isSearching ? (
                    <div
                      className="flex items-center gap-3 py-2 text-xs text-neutral-400"
                      aria-live="polite"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                      <span>
                        Searching festival &amp; cultural knowledge...
                      </span>
                    </div>
                  ) : message.role === "assistant" ? (
                    <div
                      className="w-full max-w-2xl space-y-3"
                      aria-live="polite"
                    >
                      <div className="rounded-2xl bg-white/[0.05] px-4 py-4 sm:px-5 sm:py-5">
                        {message.category ? (
                          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
                            {message.category}
                          </p>
                        ) : null}
                        {message.title ? (
                          <h2 className="mb-2 text-base font-medium tracking-tight text-white">
                            {message.title}
                          </h2>
                        ) : null}
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">
                          {message.text}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="border-l border-white/15 py-1 pl-3 text-xs leading-6 text-neutral-500">
                      {message.text}
                    </p>
                  )}
                </article>
              ))}

              {followUpItems.length > 0 && !isLoading ? (
                <div>
                  <p className="mb-2 text-[11px] font-medium text-white/40">
                    You could also ask
                  </p>
                  <SuggestionBubbles
                    items={followUpItems}
                    disabled={isLoading}
                    onSelect={(label) => void askQuestion(label)}
                  />
                </div>
              ) : null}

              <div ref={bottomRef} aria-hidden="true" className="h-1" />
            </div>
          )}
        </div>
      </section>

      <footer
        className="fixed inset-x-0 z-40 border-t border-white/10 bg-[#0b0b0b] px-3 py-2 sm:px-6"
        style={{
          /* Match BottomNav content height (min-h-[52px]) + safe-area — no seam. */
          bottom: "calc(52px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto w-full max-w-3xl">
          <AskInput
            id={inputId}
            value={question}
            onChange={setQuestion}
            onSubmit={(trimmed) => void askQuestion(trimmed)}
            placeholder={resolvedPlaceholder}
            disabled={isLoading}
            label="Your question"
          />
        </div>
      </footer>
    </>
  );
}
