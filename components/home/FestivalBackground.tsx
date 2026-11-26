"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const ROTATION_MS = 10_000;

/** 27 compressed homepage festival photographs (hero-01 … hero-27). */
const SLIDES = Array.from({ length: 27 }, (_, index) => {
  const n = String(index + 1).padStart(2, "0");
  return {
    src: `/images/home/hero-${n}.webp`,
    alt: `Hornbill Festival photograph ${n}`,
  };
}) as ReadonlyArray<{ src: string; alt: string }>;

function availableIndexes(failed: ReadonlySet<number>): number[] {
  return SLIDES.map((_, index) => index).filter((index) => !failed.has(index));
}

/**
 * Photographic hero media for the homepage.
 * Rotates every 10s with a crossfade. Only the active slide and the next
 * upcoming slide are mounted so mobile does not fetch all 27 at once.
 */
export default function FestivalBackground() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<number>>(() => new Set());
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const available = availableIndexes(failed);
    if (available.length < 2) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => {
        const pool = availableIndexes(failed);
        if (pool.length < 2) return current;
        const position = pool.indexOf(current);
        const next = position === -1 ? 0 : (position + 1) % pool.length;
        return pool[next] ?? current;
      });
    }, ROTATION_MS);

    return () => window.clearInterval(intervalId);
  }, [failed, reduceMotion]);

  const available = availableIndexes(failed);
  const position = available.indexOf(activeIndex);
  const nextIndex =
    available.length === 0
      ? activeIndex
      : available[
          position === -1 ? 0 : (position + 1) % available.length
        ] ?? activeIndex;

  // Mount only the current slide and the immediate next (preload target).
  const mountedIndexes = [...new Set([activeIndex, nextIndex])].sort(
    (a, b) => a - b
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
      <div className="relative min-h-[148px] overflow-hidden sm:min-h-[200px] md:min-h-[220px] lg:min-h-[240px]">
        <div className="absolute inset-0 bg-[#181818]">
          {mountedIndexes.map((index) => {
            const slide = SLIDES[index];
            if (!slide || failed.has(index)) return null;
            const isActive = index === activeIndex;
            return (
              <Image
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                fill
                // Only the visible slide is high-priority; the next slide
                // preloads quietly so slow cellular never downloads all 27.
                priority={isActive}
                loading={isActive ? "eager" : "lazy"}
                decoding="async"
                sizes="(max-width: 768px) 100vw, 960px"
                className={`object-cover ${
                  reduceMotion
                    ? ""
                    : "transition-opacity duration-1000 ease-in-out"
                } ${isActive ? "opacity-100" : "opacity-0"}`}
                onError={() => {
                  setFailed((current) => {
                    if (current.has(index)) return current;
                    const next = new Set(current);
                    next.add(index);
                    setActiveIndex((active) => {
                      if (!next.has(active)) return active;
                      const fallback = SLIDES.findIndex(
                        (_, slideIndex) => !next.has(slideIndex)
                      );
                      return fallback === -1 ? active : fallback;
                    });
                    return next;
                  });
                }}
              />
            );
          })}
        </div>

        {available.length === 0 ? (
          <div
            role="img"
            aria-label="Festival photograph placeholder"
            className="absolute inset-0 flex items-center justify-center bg-[#181818]"
          >
            <span className="text-[9px] uppercase tracking-[0.2em] text-white/35">
              Photograph coming soon
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
