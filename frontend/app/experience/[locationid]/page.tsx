
import { Suspense } from "react";
import { notFound } from "next/navigation";
import ExperienceClient from "./ExperienceClient";
import { locations } from "../../../data/locations";

export function generateStaticParams() {
  return Object.values(locations).map((location) => ({
    locationid: location.id,
  }));
}

export default function ExperiencePage({
  params,
}: {
  params: Promise<{ locationid: string }>;
}) {
  return (
    <Suspense fallback={<ExperienceLoading />}>
      <ExperiencePageContent params={params} />
    </Suspense>
  );
}

async function ExperiencePageContent({
  params,
}: {
  params: Promise<{ locationid: string }>;
}) {
  const { locationid } = await params;
  const id = locationid.toLowerCase();

  if (!locations[id]) {
    notFound();
  }

  return <ExperienceClient locationId={id} />;
}

function ExperienceLoading() {
  return (
    <main
      aria-busy="true"
      className="flex min-h-screen items-center justify-center bg-[#0b0b0b] px-6 pb-[calc(64px+env(safe-area-inset-bottom))] text-sm text-white/50"
    >
      Loading Morung experience…
    </main>
  );
}
