import Image from "next/image";
import Link from "next/link";
import { IconArrowUpRight } from "../../components/icons";

export const instant = false;

const destinations = [
  {
    href: "/explore/morungs",
    title: "Morungs",
    description: "Discover the Morungs of Nagaland.",
    image: "/images/morungs/angami-card.jpg",
    imageAlt: "Angami Morung at the Hornbill Festival",
  },
  {
    href: "/explore/food-handicrafts",
    title: "Food & Handicrafts",
    description:
      "Discover traditional Naga food, crafts and cultural finds at the festival.",
    image: "/images/morungs/DSC09719.webp",
    imageAlt: "Festival gathering during Hornbill",
  },
] as const;

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] pb-[calc(64px+env(safe-area-inset-bottom))] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-5xl items-center px-5 py-3.5 sm:px-8 sm:py-5">
          <Link href="/" className="text-xs font-semibold tracking-[0.12em]">
            KI-KHOBOR <span className="text-white/50">×</span> HORNBILL
            <span className="mt-1 block text-[9px] font-normal uppercase tracking-[0.2em] text-white/45">
              Ask. Know. Do.
            </span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-10 pt-6 sm:px-8 sm:pb-14 sm:pt-8">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
          Explore
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-[-0.04em] text-white sm:text-4xl">
          Discover
        </h1>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5">
          {destinations.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-[#151515] transition duration-300 hover:-translate-y-0.5 hover:border-white/25"
            >
              <div className="relative min-h-[200px] overflow-hidden sm:min-h-[260px] lg:min-h-[300px]">
                <Image
                  src={destination.image}
                  alt={destination.imageAlt}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.02]"
                  priority
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <h2 className="text-2xl font-medium tracking-[-0.035em] text-white sm:text-3xl">
                    {destination.title}
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-white/70">
                    {destination.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs text-white/75 transition group-hover:text-white">
                    Explore <IconArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
