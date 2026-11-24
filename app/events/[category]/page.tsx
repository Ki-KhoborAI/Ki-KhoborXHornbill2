import { notFound } from "next/navigation";
import EventsCategoryClient from "../../../components/events/EventsCategoryClient";
import {
  eventCategories,
  type EventCategorySlug,
} from "../../../data/eventCategories";

export function generateStaticParams() {
  return Object.keys(eventCategories).map((category) => ({ category }));
}

export default async function EventCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = eventCategories[slug as EventCategorySlug];

  if (!category) notFound();

  return <EventsCategoryClient category={category} />;
}
