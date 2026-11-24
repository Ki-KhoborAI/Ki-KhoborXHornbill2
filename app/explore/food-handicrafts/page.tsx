import { Suspense } from "react";
import FoodHandicraftsClient from "./FoodHandicraftsClient";

export const instant = false;

export default function FoodHandicraftsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100svh] items-center justify-center bg-[#0b0b0b] text-sm text-white/50">
          Loading Food &amp; Handicrafts…
        </main>
      }
    >
      <FoodHandicraftsClient />
    </Suspense>
  );
}
