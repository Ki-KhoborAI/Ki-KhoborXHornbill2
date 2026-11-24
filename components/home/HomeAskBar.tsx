"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AskInput from "../AskInput";

export default function HomeAskBar() {
  const router = useRouter();
  const [question, setQuestion] = useState("");

  return (
    <AskInput
      id="home-ask"
      value={question}
      onChange={setQuestion}
      placeholder="Ask anything…"
      onSubmit={(trimmed) => {
        router.push(`/ask?question=${encodeURIComponent(trimmed)}`);
      }}
    />
  );
}
