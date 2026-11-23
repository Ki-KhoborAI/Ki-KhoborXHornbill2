import Link from "next/link";
import MorungCardImage from "./MorungCardImage";

type DiscoveryCardProps = {
  href: string;
  image?: string | null;
  imageName: string;
  imageTribeName?: string;
  badge?: string;
  eyebrow: string;
  title: string;
  note: string;
  ariaLabel: string;
  imageOverlay?: boolean;
};

export default function DiscoveryCard({
  href,
  image,
  imageName,
  imageTribeName,
  badge,
  eyebrow,
  title,
  note,
  ariaLabel,
  imageOverlay = false,
}: DiscoveryCardProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="group overflow-hidden rounded-3xl border border-white/10 bg-[#101010] transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-[#151515]"
    >
      <div className="relative p-2">
        <div className="relative overflow-hidden rounded-[1.35rem]">
          <MorungCardImage
            src={image}
            name={imageName}
            tribeName={imageTribeName}
          />
          {imageOverlay && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-black/10"
            />
          )}
        </div>
        {badge && (
          <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[9px] uppercase tracking-[0.17em] text-white/75 backdrop-blur-md">
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-xl font-medium tracking-[-0.035em] sm:text-2xl">
            {title}
          </h3>
          <p className="mt-3 text-xs text-white/40">{note}</p>
        </div>
        <span
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/60 transition group-hover:border-white/35 group-hover:text-white"
          aria-hidden="true"
        >
          ↗
        </span>
      </div>
    </Link>
  );
}
