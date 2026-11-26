"use client";

import Image from "next/image";
import { useState } from "react";

type MorungCardImageProps = {
  src?: string | null;
  name: string;
  tribeName?: string;
};

export default function MorungCardImage({
  src,
  name,
  tribeName,
}: MorungCardImageProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = src?.trim();
  const alt = `${name}${tribeName ? `, ${tribeName} tribe` : ""}`;

  return (
    <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden border border-white/10 bg-[#121212]">
      {imageSrc && !imageFailed ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          loading="lazy"
          decoding="async"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          role="img"
          aria-label={`${name} photograph placeholder`}
          className="text-[9px] uppercase tracking-[0.18em] text-white/35"
        >
          Photograph coming soon
        </span>
      )}
    </div>
  );
}
