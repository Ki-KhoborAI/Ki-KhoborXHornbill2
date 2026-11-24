import assert from "node:assert/strict";
import test from "node:test";
import {
  formatKolkataTime,
  getEventStatus,
  sortScheduleEvents,
} from "../components/home/scheduleTime";
import type { FestivalScheduleEvent } from "../data/festivalSchedule";

const event = (
  partial: Pick<FestivalScheduleEvent, "id" | "name" | "start" | "end" | "venue">
): FestivalScheduleEvent => partial;

test("marks upcoming, live, and completed from absolute timestamps", () => {
  const item = event({
    id: "sample",
    name: "Sample",
    start: "2026-12-01T10:00:00+05:30",
    end: "2026-12-01T11:00:00+05:30",
    venue: "Sample venue",
  });

  assert.equal(
    getEventStatus(item, new Date("2026-12-01T04:29:00.000Z")),
    "upcoming"
  );
  assert.equal(
    getEventStatus(item, new Date("2026-12-01T04:30:00.000Z")),
    "live"
  );
  assert.equal(
    getEventStatus(item, new Date("2026-12-01T05:29:59.000Z")),
    "live"
  );
  assert.equal(
    getEventStatus(item, new Date("2026-12-01T05:30:00.000Z")),
    "completed"
  );
});

test("keeps simultaneous events and sorts them by venue after start time", () => {
  const sorted = sortScheduleEvents([
    event({
      id: "b",
      name: "Later",
      start: "2026-12-01T12:00:00+05:30",
      end: "2026-12-01T13:00:00+05:30",
      venue: "Arena",
    }),
    event({
      id: "a2",
      name: "Shared",
      start: "2026-12-01T10:00:00+05:30",
      end: "2026-12-01T11:00:00+05:30",
      venue: "Morung",
    }),
    event({
      id: "a1",
      name: "Shared",
      start: "2026-12-01T10:00:00+05:30",
      end: "2026-12-01T11:00:00+05:30",
      venue: "Arena",
    }),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.id),
    ["a1", "a2", "b"]
  );
});

test("formats clock times in Asia/Kolkata", () => {
  assert.equal(formatKolkataTime("2026-12-01T16:05:00+05:30"), "4:05 pm");
});
