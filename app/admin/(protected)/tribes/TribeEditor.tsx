"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TRIBE_STATUS_LABELS,
  emptyTribeFormValues,
  nextForwardStatus,
  pathToPublished,
  readApiError,
  tribeToFormValues,
  type AdminTribeRecord,
  type AdminTribeStatus,
  type TribeFormValues,
} from "./tribeTypes";

type Mode = "create" | "edit";

const FIELD_CONFIG: Array<{
  key: keyof TribeFormValues;
  label: string;
  multiline?: boolean;
  required?: boolean;
}> = [
  { key: "name", label: "Name", required: true },
  { key: "slug", label: "Slug (optional on create)" },
  { key: "regionOrDistricts", label: "Region / districts", multiline: true },
  { key: "traditionalFestivalName", label: "Traditional festival name" },
  { key: "festivalDateOrSeason", label: "Festival date / season" },
  { key: "traditions", label: "Traditions", multiline: true },
  { key: "traditionalAttire", label: "Traditional attire", multiline: true },
  {
    key: "culturalSignificance",
    label: "Cultural significance",
    multiline: true,
  },
  { key: "source", label: "Source", multiline: true },
];

function advanceLabel(status: AdminTribeStatus): string | null {
  const next = nextForwardStatus(status);
  if (!next) return null;
  if (next === "in_review") return "Send to review";
  if (next === "verified") return "Mark verified";
  if (next === "published") return "Publish";
  return null;
}

export default function TribeEditor({
  mode,
  initialTribe = null,
}: {
  mode: Mode;
  initialTribe?: AdminTribeRecord | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<TribeFormValues>(
    initialTribe ? tribeToFormValues(initialTribe) : emptyTribeFormValues()
  );
  const [savedStatus, setSavedStatus] = useState<AdminTribeStatus>(
    initialTribe?.status ?? "draft"
  );
  const [activeSlug, setActiveSlug] = useState<string | null>(
    initialTribe?.slug ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const forwardLabel = advanceLabel(savedStatus);
  const canPublish =
    savedStatus === "draft" ||
    savedStatus === "in_review" ||
    savedStatus === "verified";
  const canRestoreDraft = savedStatus === "archived";
  const canUnpublish = savedStatus === "published";

  function updateField(key: keyof TribeFormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function applyTribe(tribe: AdminTribeRecord, notice: string) {
    setActiveSlug(tribe.slug);
    setSavedStatus(tribe.status);
    setValues(tribeToFormValues(tribe));
    setMessage(notice);
    router.replace(`/admin/tribes/${encodeURIComponent(tribe.slug)}`);
    router.refresh();
  }

  async function patchStatus(
    slug: string,
    status: AdminTribeStatus
  ): Promise<AdminTribeRecord> {
    const response = await fetch(
      `/api/admin/tribes/${encodeURIComponent(slug)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
    const body = (await response.json()) as { tribe: AdminTribeRecord };
    return body.tribe;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    try {
      // Save fields only — status is changed via the action buttons below.
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim() || undefined,
        regionOrDistricts: values.regionOrDistricts,
        traditionalFestivalName: values.traditionalFestivalName,
        festivalDateOrSeason: values.festivalDateOrSeason,
        traditions: values.traditions,
        traditionalAttire: values.traditionalAttire,
        culturalSignificance: values.culturalSignificance,
        source: values.source,
      };

      const response =
        mode === "create"
          ? await fetch("/api/admin/tribes", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(
              `/api/admin/tribes/${encodeURIComponent(activeSlug ?? initialTribe!.slug)}`,
              {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
              }
            );

      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }

      const body = (await response.json()) as { tribe: AdminTribeRecord };
      applyTribe(
        body.tribe,
        mode === "create" ? "Tribe created as draft." : "Tribe saved."
      );
    } catch {
      setError("Unable to save tribe.");
    } finally {
      setPending(false);
    }
  }

  async function handleAdvanceOneStep() {
    const slug = activeSlug ?? initialTribe?.slug;
    const next = nextForwardStatus(savedStatus);
    if (!slug || !next) return;

    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const tribe = await patchStatus(slug, next);
      applyTribe(tribe, `Status updated to ${TRIBE_STATUS_LABELS[tribe.status]}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setPending(false);
    }
  }

  async function handlePublish() {
    const slug = activeSlug ?? initialTribe?.slug;
    if (!slug || !canPublish) return;

    const steps = pathToPublished(savedStatus);
    if (steps.length === 0) return;

    setError(null);
    setMessage(null);
    setPending(true);
    try {
      let tribe: AdminTribeRecord | null = null;
      for (const step of steps) {
        tribe = await patchStatus(slug, step);
      }
      if (tribe) {
        applyTribe(tribe, "Tribe published. It is now available to Ask.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to publish. Save any edits, then try again."
      );
    } finally {
      setPending(false);
    }
  }

  async function handleSendToReviewFromPublished() {
    const slug = activeSlug ?? initialTribe?.slug;
    if (!slug || !canUnpublish) return;

    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const tribe = await patchStatus(slug, "in_review");
      applyTribe(tribe, "Tribe moved back to in review.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setPending(false);
    }
  }

  async function handleRestoreDraft() {
    const slug = activeSlug ?? initialTribe?.slug;
    if (!slug || !canRestoreDraft) return;

    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const tribe = await patchStatus(slug, "draft");
      applyTribe(tribe, "Tribe restored to draft.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to restore draft.");
    } finally {
      setPending(false);
    }
  }

  async function handleArchive() {
    const slug = activeSlug ?? initialTribe?.slug;
    const name = values.name || initialTribe?.name || "this tribe";
    if (!slug) return;
    if (!window.confirm(`Archive "${name}"?`)) return;

    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const response = await fetch(
        `/api/admin/tribes/${encodeURIComponent(slug)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }
      const body = (await response.json()) as { tribe: AdminTribeRecord };
      applyTribe(body.tribe, "Tribe archived.");
    } catch {
      setError("Unable to archive tribe.");
    } finally {
      setPending(false);
    }
  }

  async function handlePermanentDelete() {
    const slug = activeSlug ?? initialTribe?.slug;
    const name = values.name || initialTribe?.name || "this tribe";
    if (!slug) return;
    if (
      !window.confirm(
        `Permanently delete "${name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const response = await fetch(
        `/api/admin/tribes/${encodeURIComponent(slug)}?permanent=1`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }
      router.replace("/admin/tribes");
      router.refresh();
    } catch {
      setError("Unable to delete tribe.");
    } finally {
      setPending(false);
    }
  }

  const actionButtons = mode === "edit" ? (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
      >
        {pending ? "Working…" : "Save"}
      </button>

      {forwardLabel && savedStatus !== "verified" ? (
        <button
          type="button"
          disabled={pending}
          onClick={handleAdvanceOneStep}
          className="min-h-11 rounded-full border border-white/20 px-4 py-2.5 text-sm text-white hover:border-white/40 disabled:opacity-60"
        >
          {forwardLabel}
        </button>
      ) : null}

      {canPublish ? (
        <button
          type="button"
          disabled={pending}
          onClick={handlePublish}
          className="min-h-11 rounded-full border border-emerald-300/40 px-4 py-2.5 text-sm text-emerald-200 hover:border-emerald-200/60 disabled:opacity-60"
        >
          Publish
        </button>
      ) : null}

      {canUnpublish ? (
        <button
          type="button"
          disabled={pending}
          onClick={handleSendToReviewFromPublished}
          className="min-h-11 rounded-full border border-white/20 px-4 py-2.5 text-sm text-white/80 hover:border-white/40 disabled:opacity-60"
        >
          Move to review
        </button>
      ) : null}

      {canRestoreDraft ? (
        <button
          type="button"
          disabled={pending}
          onClick={handleRestoreDraft}
          className="min-h-11 rounded-full border border-white/20 px-4 py-2.5 text-sm text-white/80 hover:border-white/40 disabled:opacity-60"
        >
          Restore draft
        </button>
      ) : null}

      {savedStatus !== "archived" ? (
        <button
          type="button"
          disabled={pending}
          onClick={handleArchive}
          className="min-h-11 rounded-full border border-amber-300/30 px-4 py-2.5 text-sm text-amber-200 hover:border-amber-200/50 disabled:opacity-60"
        >
          Archive
        </button>
      ) : null}

      {savedStatus === "draft" || savedStatus === "archived" ? (
        <button
          type="button"
          disabled={pending}
          onClick={handlePermanentDelete}
          className="min-h-11 rounded-full border border-red-400/40 px-4 py-2.5 text-sm text-red-300 hover:border-red-300/60 disabled:opacity-60"
        >
          Delete
        </button>
      ) : null}
    </div>
  ) : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 max-w-3xl space-y-5 pb-36 sm:mt-6 sm:pb-8"
    >
      {mode === "edit" ? (
        <div className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            Current status
          </p>
          <p className="mt-2 text-sm font-medium text-white">
            {TRIBE_STATUS_LABELS[savedStatus]}
          </p>
          <p className="mt-2 text-xs leading-5 text-white/50">
            Edit fields below, then use Save. Use Publish to go live in one tap
            (draft → review → verified → published).
          </p>
          {/* Desktop / large screens: actions stay with the status card. */}
          <div className="mt-4 hidden sm:block">{actionButtons}</div>
        </div>
      ) : (
        <p className="text-sm text-white/50">
          New tribes start as <span className="text-white/80">draft</span>. After
          create, use <span className="text-white/80">Publish</span> on the edit
          page to go live in one tap.
        </p>
      )}

      {FIELD_CONFIG.map((field) => (
        <label
          key={field.key}
          className="block text-xs uppercase tracking-[0.15em] text-white/45"
        >
          {field.label}
          {field.multiline ? (
            <textarea
              value={values[field.key]}
              onChange={(event) => updateField(field.key, event.target.value)}
              rows={4}
              required={field.required}
              className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
            />
          ) : (
            <input
              value={values[field.key]}
              onChange={(event) => updateField(field.key, event.target.value)}
              required={field.required}
              className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
            />
          )}
        </label>
      ))}

      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-300" role="status">
          {message}
        </p>
      ) : null}

      {mode === "create" ? (
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create tribe"}
          </button>
          <Link
            href="/admin/tribes"
            className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/70 hover:border-white/30 hover:text-white"
          >
            Back to list
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden pt-2 sm:block">
            <Link
              href="/admin/tribes"
              className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/70 hover:border-white/30 hover:text-white"
            >
              Back to list
            </Link>
          </div>

          {/* Phone: fixed bottom dock keeps Archive / Delete reachable while scrolling. */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0b0b0b]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden">
            <div className="mx-auto max-w-3xl space-y-2">
              {actionButtons}
              <Link
                href="/admin/tribes"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/70 hover:border-white/30 hover:text-white"
              >
                Back to list
              </Link>
            </div>
          </div>
        </>
      )}
    </form>
  );
}
