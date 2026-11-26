"use client";

import type { FormEvent } from "react";
import { IconArrowUpRight } from "./icons";
import KiKhoborLogo from "./KiKhoborLogo";

export type AskInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  /** Accessible name for the text field. */
  label?: string;
  /**
   * Optional trailing text before the chevron.
   * Keep empty for a compact icon-only submit (preferred on mobile).
   */
  actionLabel?: string;
};

/**
 * Shared Ask Ki-Khobor control. Compact editorial pill used across the site.
 */
export default function AskInput({
  id,
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled = false,
  label = "Ask Ki-Khobor",
  actionLabel,
}: AskInputProps) {
  const canSubmit = Boolean(value.trim()) && !disabled;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-full border border-white/15 bg-[#1b1b1b] py-1 pl-2.5 pr-1.5 transition hover:border-white/30 focus-within:border-white/30 sm:gap-2.5 sm:pl-3 sm:pr-1.5"
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-black"
        aria-hidden="true"
      >
        <KiKhoborLogo className="h-4 w-4" />
      </span>
      <input
        id={id}
        name={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        // Browsers/extensions may mutate the empty controlled field before
        // hydration (autofill). Keep SSR markup stable and ignore that mismatch.
        suppressHydrationWarning
        className="h-8 min-w-0 flex-1 bg-transparent text-sm text-white/90 outline-none placeholder:text-white/45 disabled:opacity-50"
      />
      <button
        type="submit"
        aria-label="Ask"
        disabled={!canSubmit}
        className={`inline-flex h-8 shrink-0 items-center justify-center rounded-full px-2.5 text-xs transition ${
          canSubmit
            ? "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
            : "cursor-not-allowed text-white/25"
        }`}
      >
        {actionLabel ? <span className="mr-1">{actionLabel}</span> : null}
        <IconArrowUpRight className="h-4 w-4" />
      </button>
    </form>
  );
}
