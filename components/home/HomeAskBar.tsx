"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function HomeAskBar() {
  const router = useRouter();
  const [question, setQuestion] = useState("");

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    router.push(`/ask?question=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={submitQuestion}
      className="flex items-center gap-2 rounded-full border border-white/20 bg-black/30 py-1.5 pl-5 pr-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-2xl"
    >
      <label htmlFor="home-ask" className="sr-only">
        Ask Ki-Khobor
      </label>
      <input
        id="home-ask"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask Ki-Khobor…"
        autoComplete="off"
        className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/55"
      />
      <button
        type="submit"
        disabled={!question.trim()}
        className="h-11 shrink-0 rounded-full bg-white/90 px-4 text-sm font-medium text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-white/50"
      >
        Ask
      </button>
    </form>
  );
}
