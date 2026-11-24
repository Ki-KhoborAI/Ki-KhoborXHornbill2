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
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <div className="absolute inset-0 bg-[#0b0b0b]">
        {SLIDES.map((slide, index) =>
          failed.has(index) ? null : (
            <Image
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              fill
              priority
              sizes="100vw"
              className={`object-cover ${
                reduceMotion ? "" : "transition-opacity duration-1000 ease-in-out"
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

      {visibleSlides.length > 0 && (
        <>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-black/75 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />
        </>
      )}
    </div>
  );
}
