/**
 * Day 1–10 Hornbill schedule — official / verified source.
 *
 * Leave `events` empty until a verified programme is available.
 * Do not add event names, venues, dates, or times from memory.
 *
 * Add entries to a day's `events` array only after each event name,
 * time, and venue has been verified from an approved programme source.
 *
 * `start` and `end` must be ISO-8601 timestamps with an explicit +05:30 offset.
 * Status (upcoming, live, completed) is calculated from those instants.
 *
 * Temporary UI demo events live in `festivalScheduleDemo.ts` and must not be
 * copied here. Switch FestivalSchedule back to this export when demos end.
 */
export type FestivalScheduleEvent = {
  id: string;
  name: string;
  start: string;
  end: string;
  venue: string;
  description?: string;
};

export type FestivalDayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type FestivalScheduleDay = {
  day: FestivalDayNumber;
  /** Optional verified calendar label, such as "1 December 2026". */
  label?: string;
  events: FestivalScheduleEvent[];
};

export const FESTIVAL_TIME_ZONE = "Asia/Kolkata";

export const festivalSchedule: FestivalScheduleDay[] = [
  { day: 1, events: [] },
  { day: 2, events: [] },
  { day: 3, events: [] },
  { day: 4, events: [] },
  { day: 5, events: [] },
  { day: 6, events: [] },
  { day: 7, events: [] },
  { day: 8, events: [] },
  { day: 9, events: [] },
  { day: 10, events: [] },
];
