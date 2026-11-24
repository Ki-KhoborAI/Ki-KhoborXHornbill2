"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { FestivalDayNumber } from "../../data/festivalSchedule";
import { festivalSchedule } from "../../data/festivalSchedule";
import {
  festivalScheduleDemo,
  USE_FESTIVAL_SCHEDULE_DEMO,
} from "../../data/festivalScheduleDemo";
import {
  formatKolkataTime,
  getEventStatus,
  sortScheduleEvents,
  type EventStatus,
} from "./scheduleTime";

const STATUS_LABEL: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  live: "Live now",
  completed: "Completed",
};

/** Demo data is isolated; flip the flag / remove the import when official data is ready. */
const scheduleSource = USE_FESTIVAL_SCHEDULE_DEMO
  ? festivalScheduleDemo
  : festivalSchedule;

const DAYS = scheduleSource.map((item) => item.day);

export default function FestivalSchedule() {
  const [day, setDay] = useState<FestivalDayNumber>(1);
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

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

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = 0;
  }, [day]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const root = dropdownRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selected =
    scheduleSource.find((item) => item.day === day) ?? scheduleSource[0];
  const events = useMemo(
    () => sortScheduleEvents(selected.events),
    [selected.events]
  );

  function focusOption(index: number) {
    window.requestAnimationFrame(() => {
      optionRefs.current[index]?.focus();
    });
  }

  function openMenu() {
    const index = DAYS.indexOf(day);
    const nextIndex = index === -1 ? 0 : index;
    setActiveIndex(nextIndex);
    setOpen(true);
    focusOption(nextIndex);
  }

  function selectDay(nextDay: FestivalDayNumber) {
    setDay(nextDay);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu();
    }
  }

  function moveActive(nextIndex: number) {
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  }

  function onListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive((activeIndex + 1) % DAYS.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive((activeIndex - 1 + DAYS.length) % DAYS.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      moveActive(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      moveActive(DAYS.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const nextDay = DAYS[activeIndex];
      if (nextDay) selectDay(nextDay);
    }
  }

  return (
    <section
      id="schedule"
      aria-labelledby="schedule-heading"
      className="flex min-h-0 flex-1 flex-col gap-4 sm:gap-5"
    >
      <div ref={dropdownRef} className="relative w-fit shrink-0">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => {
            if (open) {
              setOpen(false);
              return;
            }
            openMenu();
          }}
          onKeyDown={onTriggerKeyDown}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 bg-[#1b1b1b] px-3.5 text-xs font-medium tracking-wide text-white/85 transition hover:border-white/30 hover:bg-[#242424] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
        >
          <span>Day {selected.day}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className={`h-2.5 w-2.5 text-white/55 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          >
            <path
              d="M2.2 4.2 6 8l3.8-3.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open ? (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Festival day"
            tabIndex={-1}
            onKeyDown={onListKeyDown}
            className="absolute left-0 top-[calc(100%+0.4rem)] z-20 min-w-full overflow-hidden rounded-xl border border-white/15 bg-[#171717] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
          >
            {DAYS.map((dayNumber, index) => {
              const active = dayNumber === day;
              return (
                <button
                  key={dayNumber}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  type="button"
                  role="option"
                  aria-selected={active}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onClick={() => selectDay(dayNumber)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center px-3.5 py-2 text-left text-xs tracking-wide transition ${
                    index === activeIndex
                      ? "bg-white/10 text-white"
                      : "text-white/70"
                  } ${active ? "font-medium text-white" : ""}`}
                >
                  Day {dayNumber}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
        <header className="shrink-0 border-b border-white/10 px-5 py-3.5 sm:px-6 sm:py-4">
          <h2
            id="schedule-heading"
            className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40"
          >
            Festival schedule
          </h2>
        </header>

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5"
        >
          {events.length === 0 ? (
            <p className="max-w-xl text-sm leading-7 text-white/55">
              The Day {selected.day} schedule has not been published yet.
              Verified event names, times, and venues will appear in this
              timeline when they are added.
            </p>
          ) : (
            <ol className="space-y-3" aria-live="polite">
              {events.map((event) => {
                const status = now ? getEventStatus(event, now) : null;
                const endLabel = event.end ? formatKolkataTime(event.end) : null;

                return (
                  <li
                    key={event.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3
                          className={`text-[15px] font-medium tracking-tight ${
                            status === "completed"
                              ? "text-white/60"
                              : "text-white"
                          }`}
                        >
                          {event.name}
                        </h3>
                        <p className="mt-1 text-sm text-white/55">
                          {event.venue}
                        </p>
                        <p className="mt-1.5 text-xs tabular-nums text-white/45">
                          {formatKolkataTime(event.start)}
                          {endLabel ? (
                            <>
                              <span aria-hidden="true"> – </span>
                              <span className="sr-only"> to </span>
                              {endLabel}
                            </>
                          ) : null}
                        </p>
                      </div>
                      {status && (
                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${
                            status === "live"
                              ? "border-white/30 bg-white/10 text-white"
                              : "border-white/10 text-white/45"
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
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
