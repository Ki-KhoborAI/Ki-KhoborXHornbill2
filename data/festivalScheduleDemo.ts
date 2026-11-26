/**
 * DEMO DATA — NOT THE OFFICIAL FESTIVAL SCHEDULE.
 *
 * Temporary illustrative events for homepage UI testing only.
 * Remove this import from FestivalSchedule (or delete this file)
 * when replacing with verified programme data from festivalSchedule.ts.
 *
 * Do not treat these titles, venues, or times as real Hornbill programme information.
 *
 * IMPORTANT: Never bake Date.now() into a module-level constant. Server and
 * client would disagree and cause hydration mismatches. Build from an explicit
 * anchor instead (see buildFestivalScheduleDemo).
 */

import type {
  FestivalDayNumber,
  FestivalScheduleDay,
  FestivalScheduleEvent,
} from "./festivalSchedule";
import { FESTIVAL_TIME_ZONE } from "./festivalSchedule";

const DEMO_VENUES = [
  "Main Arena",
  "Heritage Gate",
  "Cultural Pavilion",
  "Food Court Lawn",
  "Amphitheatre",
  "Crafts Courtyard",
] as const;

const DEMO_TITLES = [
  "Opening procession",
  "Folk dance showcase",
  "Craft demonstration",
  "Visitor briefing",
  "Evening performance",
  "Photography walk",
  "Youth cultural hour",
  "Culinary tasting",
] as const;

/**
 * Stable anchor for the first paint (SSR + hydration).
 * Must not use Date.now() — only a fixed instant.
 */
export const FESTIVAL_SCHEDULE_DEMO_SSR_ANCHOR = new Date(
  "2026-12-01T12:00:00.000+05:30"
);

/** Format an absolute instant as ISO-8601 with explicit +05:30 (Asia/Kolkata). */
function toKolkataIso(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: FESTIVAL_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+05:30`;
}

function hoursFromAnchor(anchorMs: number, hours: number): Date {
  return new Date(anchorMs + hours * 60 * 60 * 1000);
}

function demoEvent(
  anchorMs: number,
  id: string,
  name: string,
  venue: string,
  startHoursFromAnchor: number,
  endHoursFromAnchor: number
): FestivalScheduleEvent {
  return {
    id,
    name,
    venue,
    start: toKolkataIso(hoursFromAnchor(anchorMs, startHoursFromAnchor)),
    end: toKolkataIso(hoursFromAnchor(anchorMs, endHoursFromAnchor)),
  };
}

function buildDemoDay(
  anchorMs: number,
  day: FestivalDayNumber
): FestivalScheduleDay {
  const titleA = DEMO_TITLES[(day - 1) % DEMO_TITLES.length];
  const titleB = DEMO_TITLES[day % DEMO_TITLES.length];
  const titleC = DEMO_TITLES[(day + 2) % DEMO_TITLES.length];
  const venueA = DEMO_VENUES[(day - 1) % DEMO_VENUES.length];
  const venueB = DEMO_VENUES[day % DEMO_VENUES.length];
  const venueC = DEMO_VENUES[(day + 1) % DEMO_VENUES.length];

  // Day 1 includes completed, live, and upcoming examples relative to anchor.
  if (day === 1) {
    return {
      day,
      events: [
        demoEvent(anchorMs, `demo-d1-completed`, titleA, venueA, -3, -1),
        demoEvent(anchorMs, `demo-d1-live`, titleB, venueB, -0.5, 1.5),
        demoEvent(anchorMs, `demo-d1-upcoming`, titleC, venueC, 2, 3.5),
        demoEvent(
          anchorMs,
          `demo-d1-upcoming-late`,
          DEMO_TITLES[4],
          DEMO_VENUES[4],
          5,
          6.5
        ),
      ],
    };
  }

  // Later days: all upcoming, staggered chronologically, intentionally out of
  // insertion order so UI sorting can be verified.
  const dayOffset = (day - 1) * 24;
  return {
    day,
    events: [
      demoEvent(
        anchorMs,
        `demo-d${day}-b`,
        titleB,
        venueB,
        dayOffset + 4,
        dayOffset + 5.5
      ),
      demoEvent(
        anchorMs,
        `demo-d${day}-a`,
        titleA,
        venueA,
        dayOffset + 1,
        dayOffset + 2.5
      ),
      demoEvent(
        anchorMs,
        `demo-d${day}-c`,
        titleC,
        venueC,
        dayOffset + 7,
        dayOffset + 8.5
      ),
    ],
  };
}

/** Build demo days relative to an explicit anchor (never implicit Date.now()). */
export function buildFestivalScheduleDemo(
  anchor: Date
): FestivalScheduleDay[] {
  const anchorMs = anchor.getTime();
  return ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as FestivalDayNumber[]).map((day) =>
    buildDemoDay(anchorMs, day)
  );
}

export const USE_FESTIVAL_SCHEDULE_DEMO = true;

/**
 * Deterministic demo used for SSR + hydration first paint.
 * After mount, FestivalSchedule rebuilds from the live clock.
 */
export const festivalScheduleDemo: FestivalScheduleDay[] =
  buildFestivalScheduleDemo(FESTIVAL_SCHEDULE_DEMO_SSR_ANCHOR);
