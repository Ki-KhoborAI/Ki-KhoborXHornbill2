"use client";

import Link from "next/link";

type SiteHeaderProps = {
  rightLabel: string;
  rightHref?: string;
  contextLabel?: string;
};

export default function SiteHeader({
  rightLabel,
  rightHref,
  contextLabel,
}: SiteHeaderProps) {
  const rightClass = "text-xs text-white/60 transition hover:text-white";

  return (
    <header className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 sm:px-10 sm:py-6">
      <Link href="/" className="text-xs font-semibold tracking-[0.12em]">
        KI-KHOBOR <span className="text-white/50">×</span> HORNBILL
        <span className="mt-1 block text-[9px] font-normal uppercase tracking-[0.2em] text-white/45">
          Ask. Know. Do.
        </span>
      </Link>

      <div className="flex items-center gap-4">
        {contextLabel && (
          <span className="hidden text-[10px] uppercase tracking-[0.2em] text-white/75 sm:block">
            {contextLabel}
          </span>
        )}
        {rightHref ? (
          <Link href={rightHref} className={rightClass}>
            {rightLabel}
          </Link>
        ) : (
          <span className={rightClass}>{rightLabel}</span>
        )}
      </div>
    </header>
  );
}
