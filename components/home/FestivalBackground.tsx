"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const ROTATION_MS = 15_000;

/** Unique festival photographs already in the project. The Pochury file duplicates Chakhesang, so it is not a separate slide. */
const SLIDES = [
  {
    src: "/images/morungs/angami-card.jpg",
    alt: "Angami Morung at night during the Hornbill Festival",
  },
  {
    src: "/images/morungs/chakhesang-card.jpg",
    alt: "Gathering outside a morung at the Hornbill Festival",
  },
] as const;

/**
 * Photographic hero media for the homepage.
 * Preserves the existing 15s rotation, crossfade, reduced-motion and error handling.
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

    const available = SLIDES.map((_, index) => index).filter(
      (index) => !failed.has(index)
    );
    if (available.length < 2) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => {
        const pool = SLIDES.map((_, index) => index).filter(
          (index) => !failed.has(index)
        );
        if (pool.length < 2) return current;
        const position = pool.indexOf(current);
        const next = position === -1 ? 0 : (position + 1) % pool.length;
        return pool[next] ?? current;
      });
    }, ROTATION_MS);

    return () => window.clearInterval(intervalId);
  }, [failed, reduceMotion]);

  const visibleSlides = SLIDES.filter((_, index) => !failed.has(index));

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
      <div className="relative min-h-[148px] overflow-hidden sm:min-h-[200px] md:min-h-[220px] lg:min-h-[240px]">
        <div className="absolute inset-0 bg-[#181818]">
          {SLIDES.map((slide, index) =>
            failed.has(index) ? null : (
              <Image
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 1024px"
                className={`object-cover ${
                  reduceMotion
                    ? ""
                    : "transition-opacity duration-1000 ease-in-out"
                } ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
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
            )
          )}
        </div>

        {visibleSlides.length === 0 ? (
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
