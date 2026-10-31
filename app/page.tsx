import Link from "next/link";

const navigation = [
  {
    title: "Explore",
    description: "Places & stories",
    href: "/explore",
  },
  {
    title: "Events",
    description: "Festival info",
    href: "/events",
  },
  {
    title: "Ask Ki-Khobor",
    description: "Find answers",
    href: "/ask",
  },
];

export default function HomePage() {
  return (
    <main className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-black pb-[calc(64px+env(safe-area-inset-bottom))] text-white">
      {/* Background photograph */}
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=2400&q=85')",
        }}
        aria-hidden="true"
      />

      {/* Dark overlays for readability */}
      <div
        className="absolute inset-0 -z-10 bg-black/55"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/10 to-black/85"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative flex items-center justify-between gap-4 px-6 py-6 sm:px-10 sm:py-8">
        <Link
          href="/"
          className="text-xs font-semibold tracking-[0.16em] sm:text-sm"
        >
          KI-KHOBOR <span className="text-white/50">×</span> HORNBILL
        </Link>

        <span className="hidden text-[10px] uppercase tracking-[0.2em] text-white/75 sm:block">
          Nagaland, India
        </span>

        <Link
          href="/explore"
          className="text-xs text-white/85 transition hover:text-white sm:hidden"
        >
          Explore ↗
        </Link>
      </header>

      {/* Main hero content */}
      <section className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 pb-16 pt-12 sm:px-12 lg:px-16">
        <div className="max-w-3xl">
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/75 sm:text-[10px]">
            A digital companion to Hornbill
          </p>

          <h1 className="mt-6 max-w-3xl text-5xl font-medium leading-[0.98] tracking-[-0.065em] sm:text-7xl lg:text-8xl">
            There is more to
            <br />
            every story.
          </h1>

          <p className="mt-6 max-w-md text-sm leading-6 text-white/80 sm:text-base sm:leading-7">
            Discover the people, places and traditions that bring Nagaland
            to life.
          </p>

          <Link
            href="/explore"
            className="mt-8 inline-flex min-h-14 items-center gap-8 bg-white px-5 text-sm font-medium text-black transition hover:bg-neutral-200 sm:px-6"
          >
            Explore Kisama
            <span aria-hidden="true" className="text-lg">
              ↗
            </span>
          </Link>
        </div>
      </section>

      {/* Feature navigation */}
      <section className="relative mx-auto w-full max-w-7xl px-6 sm:px-12 lg:px-16">
        <div className="grid grid-cols-3 border-t border-white/35">
          {navigation.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group min-w-0 border-r border-white/20 py-5 pr-2 transition hover:bg-white/[0.05] sm:px-5 sm:py-6 first:sm:pl-0 last:border-r-0"
            >
              <h2 className="text-xs font-medium leading-5 sm:text-base">
                {item.title}
              </h2>
              <p className="mt-1 text-[9px] leading-4 text-white/65 sm:text-xs">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative flex items-center justify-between gap-3 px-6 py-5 sm:px-10">
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/70">
          K · Know · Discover
        </span>
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/70">
          Hornbill 2026
        </span>
      </footer>
    </main>
  );
}