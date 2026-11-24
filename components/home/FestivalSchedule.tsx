"use client";

import { useEffect, useMemo, useState } from "react";
import { festivalSchedule } from "../../data/festivalSchedule";
import type { FestivalDayNumber } from "../../data/festivalSchedule";
import {
  formatKolkataTime,
  getEventStatus,
  sortScheduleEvents,
  type EventStatus,
} from "./scheduleTime";

const STATUS_LABEL: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  live: "Live",
  completed: "Completed",
};

export default function FestivalSchedule() {
  const [day, setDay] = useState<FestivalDayNumber>(1);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const initialFrameId = window.requestAnimationFrame(tick);
    const intervalId = window.setInterval(tick, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.cancelAnimationFrame(initialFrameId);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const selected = festivalSchedule.find((item) => item.day === day) ?? festivalSchedule[0];
  const events = useMemo(
    () => sortScheduleEvents(selected.events),
    [selected.events]
  );

  return (
    <section
      id="schedule"
      aria-labelledby="schedule-heading"
      className="relative px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-8 sm:px-8"
    >
      <div className="mx-auto w-full max-w-3xl rounded-[28px] border border-white/15 bg-white/[0.07] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-2xl sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/55">
              Festival schedule
            </p>
            <h2
              id="schedule-heading"
              className="mt-2 text-3xl font-medium tracking-[-0.04em] text-white"
            >
              Day {selected.day}
              {selected.label ? (
                <span className="mt-1 block text-sm font-normal tracking-normal text-white/60">
                  {selected.label}
                </span>
              ) : null}
            </h2>
          </div>

          <label className="block sm:min-w-52">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-white/50">
              Select a day
            </span>
            <select
              value={day}
              onChange={(event) =>
                setDay(Number(event.target.value) as FestivalDayNumber)
              }
              className="h-12 w-full rounded-2xl border border-white/20 bg-black/35 px-3 text-sm text-white outline-none backdrop-blur-xl"
            >
              {festivalSchedule.map((item) => (
                <option key={item.day} value={item.day} className="bg-[#161616]">
                  Day {item.day}
                  {item.label ? ` · ${item.label}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {events.length === 0 ? (
          <p className="mt-8 max-w-xl text-sm leading-7 text-white/70">
            The Day {selected.day} schedule has not been published yet. Verified
            event names, times, and venues will appear in this timeline when
            they are added.
          </p>
        ) : (
          <ol className="mt-8 space-y-3" aria-live="polite">
            {events.map((event) => {
              const status = now ? getEventStatus(event, now) : null;
              return (
                <li
                  key={event.id}
                  className="rounded-[22px] border border-white/12 bg-black/25 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs tabular-nums text-white/60">
                        {formatKolkataTime(event.start)}
                        <span aria-hidden="true"> – </span>
                        <span className="sr-only"> to </span>
                        {formatKolkataTime(event.end)}
                      </p>
                      <h3
                        className={`mt-1 text-base font-medium tracking-tight ${
                          status === "completed" ? "text-white/70" : "text-white"
                        }`}
                      >
                        {event.name}
                      </h3>
                    </div>
                    {status && (
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${
                          status === "live"
                            ? "border-white/30 bg-white/15 text-white"
                            : "border-white/10 text-white/55"
                        }`}
                      >
                        {status === "live" && (
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 rounded-full bg-white"
                          />
                        )}
                        {STATUS_LABEL[status]}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-white/80">{event.venue}</p>
                  {event.description && (
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      {event.description}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
