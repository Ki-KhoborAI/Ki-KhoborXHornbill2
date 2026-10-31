
import { Suspense } from "react";
import AskClient from "./AskClient";

export const instant = false;

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100svh] bg-[#080808] p-6 text-white">
          Loading Ask Ki-Khobor...
        </main>
      }
    >
      <AskClient />
    </Suspense>
  );
}
