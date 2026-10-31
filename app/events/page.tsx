import Link from "next/link";

const highlights = [
  {
    number: "01",
    title: "Cultural performances",
    description:
      "Discover the performances, music and traditions featured at the festival.",
    tag: "CULTURE",
  },
  {
    number: "02",
    title: "Traditional Morungs",
    description:
      "Explore the Morungs and learn about the communities and stories they represent.",
    tag: "DISCOVERY",
  },
  {
    number: "03",
    title: "Arts, crafts and food",
    description:
      "Explore the creative traditions, local crafts and food experiences of Nagaland.",
    tag: "EXPERIENCES",
  },
];

const visitorInfo = [
  {
    title: "Explore the festival",
    description:
      "Browse available locations and open a Morung experience to learn more.",
    href: "/explore",
    linkText: "Explore places",
  },
  {
    title: "Scan a location QR",
    description:
      "Scan a Ki-Khobor QR code at a participating location to open its dedicated guide.",
    href: "/explore",
    linkText: "See locations",
  },
  {
    title: "Discover with Ki-Khobor",
    description:
      "Use the information available for each place to learn more about the festival.",
    href: "/explore",
    linkText: "Start discovering",
  },
];

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-[#080808] pb-[calc(64px+env(safe-area-inset-bottom))] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-6 sm:px-10">
        <Link href="/" className="text-xs font-semibold tracking-[0.12em]">
          KI-KHOBOR <span className="text-white/50">×</span> HORNBILL
          <span className="mt-1 block text-[9px] font-normal uppercase tracking-[0.2em] text-white/45">
            Ask. Know. Do.
          </span>
        </Link>

        <Link
          href="/explore"
          className="text-xs text-white/60 transition hover:text-white"
        >
          Explore places ↗
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-10 sm:py-24">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">
          Festival guide
        </p>

        <h1 className="mt-5 max-w-4xl text-4xl font-medium leading-[1.05] tracking-[-0.06em] sm:text-7xl">
          Make room
          <br />
          for discovery.
        </h1>

        <p className="mt-6 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
          From cultural performances to traditional Morungs, discover
          the experiences that make Hornbill Festival a celebration
          of Nagaland's living cultures.
        </p>

        <div className="mt-10 inline-flex items-center gap-2 border border-white/20 px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
          <span className="text-[9px] uppercase tracking-[0.15em] text-white/60">
            Festival highlights · Preview
          </span>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Explore the experience
              </p>
              <h2 className="mt-4 text-3xl font-medium tracking-[-0.05em] sm:text-4xl">
                What interests you?
              </h2>
            </div>

            <p className="max-w-sm text-sm leading-6 text-white/45">
              These are discovery categories, not a confirmed
              festival timetable.
            </p>
          </div>

          <div className="mt-10 border-t border-white/15">
            {highlights.map((item) => (
              <article
                key={item.number}
                className="grid gap-4 border-b border-white/15 py-7 sm:grid-cols-[55px_1fr_1fr] sm:items-start sm:gap-6 sm:py-9"
              >
                <span className="text-xs text-white/35">
                  {item.number}
                </span>

                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                    {item.tag}
                  </p>
                  <h3 className="mt-3 text-xl font-medium tracking-tight sm:text-2xl">
                    {item.title}
                  </h3>
                </div>

                <p className="max-w-md text-sm leading-7 text-white/50">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0d0d0d] px-5 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
            Before you explore
          </p>

          <h2 className="mt-4 max-w-2xl text-3xl font-medium tracking-[-0.05em] sm:text-4xl">
            Useful information, without the guesswork.
          </h2>

          <p className="mt-5 max-w-xl text-sm leading-7 text-white/50">
            This prototype demonstrates how visitors can find
            information. Official schedules, timings and visitor
            instructions must be verified before publication.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {visitorInfo.map((item, index) => (
              <article
                key={item.title}
                className="flex flex-col border border-white/15 p-6 sm:p-7"
              >
                <span className="text-xs text-white/35">
                  0{index + 1}
                </span>

                <h3 className="mt-7 text-lg font-medium">
                  {item.title}
                </h3>

                <p className="mt-3 flex-1 text-sm leading-6 text-white/50">
                  {item.description}
                </p>

                <Link
                  href={item.href}
                  className="mt-7 inline-flex items-center gap-3 text-xs text-white/80 transition hover:text-white"
                >
                  {item.linkText} <span aria-hidden="true">↗</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-xs font-semibold tracking-[0.12em]">
            KI-KHOBOR <span className="text-white/50">×</span> HORNBILL
          </Link>

          <Link
            href="/explore"
            className="text-xs text-white/50 transition hover:text-white"
          >
            Continue exploring ↗
          </Link>
        </div>
      </footer>
    </main>
  );
}