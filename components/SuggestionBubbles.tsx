"use client";

import Link from "next/link";

export type SuggestionBubbleItem = {
  key: string;
  label: string;
  /** When set, renders as a link instead of a submit button. */
  href?: string;
};

type SuggestionBubblesProps = {
  items: SuggestionBubbleItem[];
  onSelect?: (label: string) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Compact conversational suggestion / follow-up bubbles.
 */
export default function SuggestionBubbles({
  items,
  onSelect,
  disabled = false,
  className = "",
}: SuggestionBubblesProps) {
  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {items.map((item) => {
        const bubbleClass =
          "max-w-full rounded-2xl bg-white/[0.07] px-3.5 py-2.5 text-left text-sm leading-5 text-white/80 transition hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

        if (item.href) {
          return (
            <Link key={item.key} href={item.href} className={bubbleClass}>
              {item.label}
              <span aria-hidden="true" className="ml-1.5 text-white/45">
                ↗
              </span>
            </Link>
          );
        }

        return (
          <button
            key={item.key}
            type="button"
            disabled={disabled}
            onClick={() => onSelect?.(item.label)}
            className={bubbleClass}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
