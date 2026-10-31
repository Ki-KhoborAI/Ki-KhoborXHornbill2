
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { locations } from "../../data/locations";

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
  role: "user" | "assistant";
  text: string;
  suggestions?: string[];
};

const followUpQuestions: Record<string, string[]> = {
  hornbill: [
    "Why is the Hornbill Festival called the Festival of Festivals?",
    "Which Naga tribes participate in the festival?",
    "What activities can visitors experience?",
  ],
  kisama: [
    "What is a Naga morung?",
    "What traditional foods can I try at Kisama?",
    "What cultural performances can I see?",
  ],
  tribes: [
    "What are the different Naga tribes?",
    "What are some traditional Naga festivals?",
    "What is the significance of traditional Naga attire?",
  ],
  default: [
    "Tell me more about Naga traditions.",
    "What can I explore at Kisama Heritage Village?",
    "What traditional foods are popular in Nagaland?",
  ],
};

function getFollowUps(question: string): string[] {
  const value = question.toLowerCase();

  if (
    value.includes("kisama") ||
    value.includes("morung") ||
    value.includes("heritage village")
  ) {
    return followUpQuestions.kisama;
  }

  if (
    value.includes("tribe") ||
    value.includes("culture") ||
    value.includes("tradition")
  ) {
    return followUpQuestions.tribes;
  }

  if (
    value.includes("hornbill") ||
    value.includes("festival") ||
    value.includes("event")
  ) {
    return followUpQuestions.hornbill;
  }

  return followUpQuestions.default;
}

function getPreviewAnswer(question: string): string {
  const value = question.toLowerCase();

  if (value.includes("kisama") || value.includes("heritage village")) {
    return "Kisama Heritage Village, near Kohima, is the main venue of the Hornbill Festival. It brings together cultural presentations, traditional architecture, crafts, food and performances representing Nagaland's diverse communities.\n\nI'm currently using preview information. The connected festival handbook and AI service will be needed for detailed, source-based answers.";
  }

  if (value.includes("tribe") || value.includes("naga culture")) {
    return "Nagaland is home to several Naga communities, each with its own cultural practices, traditions, festivals, crafts and forms of artistic expression.\n\nI'm currently using preview information. Once the festival handbook is connected, I can provide more detailed information grounded in your source material.";
  }

  if (value.includes("hornbill")) {
    return "The Hornbill Festival is an annual cultural festival held in Nagaland, with its main venue at Kisama Heritage Village near Kohima. It celebrates the state's diverse cultural heritage through traditional performances, crafts, food and community presentations.\n\nI'm currently using preview information. Connecting your festival handbook will allow more detailed answers based on your approved content.";
  }

  return "Thanks for your question about Nagaland! I'm currently in preview mode. Once the approved Hornbill Festival handbook and AI service are connected, I'll be able to provide a detailed answer grounded in the available festival information.";
}

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

  const askQuestion = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const answer = getPreviewAnswer(trimmed);
    const suggestedQuestions = getFollowUps(trimmed);

    setMessages((previous) => [
      ...previous,
      { role: "user", text: trimmed },
      {
        role: "assistant",
        text: answer,
        suggestions: suggestedQuestions,
      },
    ]);

    setQuestion("");
  }, []);

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

          <span className="text-[10px] text-neutral-600">PREVIEW</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Ask Ki-Khobor
            </h1>
            <p className="mt-1 text-xs text-neutral-400 sm:text-sm">
              Explore the stories and traditions of Nagaland.
            </p>
          </div>
        </div>

        {location && (
          <div className="mt-2 text-xs text-neutral-400">
            Exploring: <span>{location.name}</span>
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
                Or type your own question below.
              </p>
            </div>
          ) : (
            <div className="space-y-7">
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
                    <div className="max-w-[90%] rounded-3xl rounded-br-md bg-[#202020] px-4 py-3 sm:max-w-[80%]">
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white">
                        {message.text}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full max-w-2xl py-1">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-sm">
                          ✳
                        </span>
                        <span className="text-xs font-medium text-neutral-300">
                          Ki-Khobor
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-neutral-300">
                        {message.text}
                      </p>

                      {message.suggestions &&
                        message.suggestions.length > 0 && (
                          <div className="mt-5">
                            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-500">
                              You might also ask
                            </p>

                            <div className="flex flex-col items-start gap-2">
                              {message.suggestions.map((suggestion) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  onClick={() => askQuestion(suggestion)}
                                  className="max-w-full rounded-full border border-white/[0.12] px-3 py-2 text-left text-xs leading-5 text-neutral-300 transition-colors hover:border-white/30 hover:bg-white/[0.05] hover:text-white"
                                >
                                  {suggestion}
                                  <span className="ml-2 text-neutral-500">
                                    ↗
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </article>
              ))}

              <div ref={bottomRef} aria-hidden="true" className="h-1" />
            </div>
          )}
        </div>
      </section>

      {/* Fixed composer above the existing bottom navigation */}
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
              placeholder="Ask anything about Nagaland..."
              aria-label="Your question"
              autoComplete="off"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
            />

            <button
              type="submit"
              aria-label="Send question"
              disabled={!question.trim()}
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
