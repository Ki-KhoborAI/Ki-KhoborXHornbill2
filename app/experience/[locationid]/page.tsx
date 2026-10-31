
import { notFound } from "next/navigation";
import ExperienceClient from "./ExperienceClient";
import { locations } from "../../../data/locations";

export function generateStaticParams() {
  return Object.values(locations).map((location) => ({
    locationid: location.id,
  }));
}

export default async function ExperiencePage({
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
