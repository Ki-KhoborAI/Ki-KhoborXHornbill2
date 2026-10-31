
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type ExperienceSectionKey,
  locations,
} from "../../../data/locations";
import {
  ASK_PREVIEW_ACKNOWLEDGEMENT,
  createAskRequestContext,
  logAskRequestContext,
  type AskRequestContext,
} from "../../../lib/askContext";

const BOTTOM_NAV_HEIGHT = 64;

const experienceSectionOrder: {
  key: ExperienceSectionKey;
  title: string;
}[] = [
  { key: "history", title: "History" },
  { key: "culture", title: "Culture" },
  { key: "traditionalAttire", title: "Traditional attire" },
  { key: "food", title: "Food" },
  { key: "crafts", title: "Crafts" },
  { key: "music", title: "Music" },
  { key: "traditions", title: "Traditions" },
];

type ExperienceClientProps = {
  locationId: string;
};

export default function ExperienceClient({
  locationId,
}: ExperienceClientProps) {
  const router = useRouter();
  const id = locationId.toLowerCase();
  const location = locations[id];
  const experienceSections = location
    ? experienceSectionOrder.map(({ key, title }) => {
        const rawContent = location.sections?.[key];
        const isVerified =
          location.sectionVerificationStatus?.[key] === "verified";
        const content =
          isVerified && Array.isArray(rawContent)
            ? rawContent.filter(
                (paragraph): paragraph is string =>
                  typeof paragraph === "string" && paragraph.trim().length > 0
              )
            : [];

        return { title, content };
      })
    : [];

  const [question, setQuestion] = useState("");
  const [submittedRequests, setSubmittedRequests] = useState<AskRequestContext[]>([]);
  const [submissionCount, setSubmissionCount] = useState(0);

  const latestMessageRef = useRef<HTMLDivElement>(null);
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    setQuestion("");
    setSubmittedRequests([]);
    hasSubmittedRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!hasSubmittedRef.current) return;

    latestMessageRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [submissionCount]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    hasSubmittedRef.current = true;
    const requestContext = createAskRequestContext(trimmedQuestion, location);
    logAskRequestContext(requestContext);
    setSubmittedRequests((previous) => [...previous, requestContext]);
    setQuestion("");
    setSubmissionCount((count) => count + 1);
  }

  function chooseQuestion(prompt: string) {
    if (prompt === "Explore other Morungs") {
      router.push("/explore");
      return;
    }

    setQuestion(prompt);
  }

  if (!location) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0b0b] px-6 pb-[calc(64px+env(safe-area-inset-bottom))] text-white">
        <div className="max-w-md">
          <p className="text-xs tracking-[0.2em] text-white/50">
            KI-KHOBOR × HORNBILL
          </p>

          <h1 className="mt-5 text-3xl font-medium">
            Location not found
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/60">
            We couldn&apos;t find this location. Check the URL or return
            to the homepage to explore the festival.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-full border border-white/30 px-5 py-3 text-sm transition-colors hover:bg-white hover:text-black"
          >
            Back to home
          </Link>

          <p className="mt-4 text-xs text-white/30">
            Requested location: {id || "none"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="fixed inset-x-0 top-0 flex flex-col overflow-hidden bg-[#0b0b0b] text-white"
      style={{
        height: "100dvh",
        paddingBottom: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <header className="z-20 shrink-0 border-b border-white/10 bg-[#0b0b0b] px-5 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="block">
            <p className="text-xs font-semibold tracking-[0.12em]">
              KI-KHOBOR <span className="text-white/50">×</span> HORNBILL
            </p>

            <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-white/45">
              Ask. Know. Do.
            </p>
          </Link>

          <span className="text-[9px] uppercase tracking-[0.15em] text-white/55">
            Festival guide
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#0b0b0b]">
        <div className="mx-auto max-w-5xl px-5 pb-8 sm:px-8">
          <section className="pt-8 sm:pt-12">
            <Link
              href="/"
              className="text-xs text-white/50 transition-colors hover:text-white"
            >
              ← Back to home
            </Link>

            <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
              <div className="relative flex min-h-[200px] items-end overflow-hidden p-6 sm:min-h-[300px] sm:p-9">
                {location.image ? (
                  <Image
                    src={location.image}
                    alt={`${location.name} photograph`}
                    width={1200}
                    height={700}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div
                    role="img"
                    aria-label={`${location.name} photograph placeholder`}
                    className="absolute inset-0 flex items-center justify-center bg-[#181818]"
                  >
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/35">
                      Photograph coming soon
                    </span>
                  </div>
                )}

                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
                />

                <div className="relative z-10">
                  <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-white/60">
                    {location.category || "MORUNG EXPERIENCE"}
                  </p>

                  <h1 className="text-4xl font-medium tracking-[-0.05em] sm:text-6xl">
                    {location.name}
                  </h1>

                  {location.tribeName && (
                    <p className="mt-2 text-xs text-white/60 sm:text-sm">
                      Associated tribe: {location.tribeName}
                    </p>
                  )}

                  <p className="mt-3 text-xs text-white/65 sm:text-sm">
                    Kisama Heritage Village · Nagaland
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-8">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Welcome
                </p>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                  {location.description || "More information coming soon."}
                </p>

              </div>
            </div>
          </section>

          {experienceSections.map((section) => (
            <section key={section.title} className="pt-8 sm:pt-10">
              <h2 className="text-lg font-medium tracking-tight sm:text-xl">
                {section.title}
              </h2>
              {section.content.length > 0 ? (
                <div className="mt-3 space-y-3 text-sm leading-7 text-white/65">
                  {section.content.map((paragraph, index) => (
                    <p key={`${section.title}-${index}`}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-white/45">
                  More information coming soon.
                </p>
              )}
            </section>
          ))}

          <section className="pt-10 sm:pt-14">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-black">
                K
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium">Hi! I&apos;m Ki-Khobor.</p>

                <p className="mt-2 text-sm leading-6 text-white/60">
                  Ask about this location, its culture or the wider festival.
                  Choose a suggestion to get started.
                </p>
              </div>
            </div>

            <div className="mt-6 sm:ml-[52px]">
              <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-white/40">
                YOU COULD ASK
              </p>

              <div className="flex flex-wrap gap-2">
                {(location.questions ?? []).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => chooseQuestion(prompt)}
                    className="rounded-full border border-white/15 px-4 py-3 text-left text-xs text-white/75 transition-colors hover:border-white/50 hover:bg-white/5"
                  >
                    {prompt}
                    <span aria-hidden="true" className="ml-3 text-white/40">
                      ↗
                    </span>
                  </button>
                ))}
              </div>

            </div>

            {submittedRequests.map((request, index) => (
              <div
                key={`${index}-${request.question}`}
                className="mt-8 space-y-4 sm:ml-[52px]"
              >
                <div className="ml-auto max-w-[90%] break-words rounded-2xl rounded-br-sm bg-white px-4 py-3 text-sm text-black">
                  {request.question}
                </div>

                <p
                  ref={index === submittedRequests.length - 1 ? latestMessageRef : undefined}
                  aria-live={index === submittedRequests.length - 1 ? "polite" : undefined}
                  className="max-w-[90%] border-l border-white/15 pl-3 text-xs leading-6 text-white/50"
                >
                  {ASK_PREVIEW_ACKNOWLEDGEMENT}
                </p>
              </div>
            ))}
          </section>
        </div>
      </div>

      <section
        className="relative z-30 shrink-0 border-t border-white/10 bg-[#0b0b0b] px-3 pt-3 pb-2 sm:px-5"
        aria-label="Ask Ki-Khobor"
      >
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-full border border-white/15 bg-[#171717] p-2 pl-4 sm:pl-5"
        >
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={`Ask about ${location.name}...`}
            aria-label="Ask Ki-Khobor a question"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/35"
          />

          <button
            type="submit"
            disabled={!question.trim()}
            aria-label="Submit question"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg text-black transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↑
          </button>
        </form>

        <p className="mt-2 text-center text-[9px] text-white/35">
          Preview mode · AI answers are not connected yet
        </p>
      </section>
    </main>
  );
}
