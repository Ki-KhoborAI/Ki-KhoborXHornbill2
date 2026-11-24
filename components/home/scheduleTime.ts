import { FESTIVAL_TIME_ZONE } from "../../data/festivalSchedule";
import type { FestivalScheduleEvent } from "../../data/festivalSchedule";

export type EventStatus = "upcoming" | "live" | "completed";

/** Live from the start instant up to, but not including, the end instant. */
export function getEventStatus(
  event: Pick<FestivalScheduleEvent, "start" | "end">,
  now: Date
): EventStatus | null {
  const start = Date.parse(event.start);
  const end = Date.parse(event.end);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;

  const time = now.getTime();
  if (time < start) return "upcoming";
  if (time < end) return "live";
  return "completed";
}

export function sortScheduleEvents(
  events: FestivalScheduleEvent[]
): FestivalScheduleEvent[] {
  return [...events].sort((a, b) => {
    const startDelta = Date.parse(a.start) - Date.parse(b.start);
    if (startDelta !== 0 && !Number.isNaN(startDelta)) return startDelta;
    return a.venue.localeCompare(b.venue, "en");
  });
}

export function formatKolkataTime(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "Time unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: FESTIVAL_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(time);
}
