"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TRIBE_STATUS_LABELS,
  TRIBE_STATUS_TRANSITIONS,
  emptyTribeFormValues,
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
  const [status, setStatus] = useState<AdminTribeStatus>(
    initialTribe?.status ?? "draft"
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const allowedNextStatuses = useMemo(() => {
    if (mode === "create") return [] as AdminTribeStatus[];
    const unique = new Set<AdminTribeStatus>([
      status,
      ...TRIBE_STATUS_TRANSITIONS[status],
    ]);
    return Array.from(unique);
  }, [mode, status]);

  function updateField(key: keyof TribeFormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    try {
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
        ...(mode === "edit" ? { status } : {}),
      };

      const response =
        mode === "create"
          ? await fetch("/api/admin/tribes", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(
              `/api/admin/tribes/${encodeURIComponent(initialTribe!.slug)}`,
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
      setMessage(mode === "create" ? "Tribe created." : "Tribe saved.");
      router.replace(`/admin/tribes/${encodeURIComponent(body.tribe.slug)}`);
      router.refresh();
    } catch {
      setError("Unable to save tribe.");
    } finally {
      setPending(false);
    }
  }

  async function handleArchive() {
    if (!initialTribe) return;
    if (!window.confirm(`Archive "${initialTribe.name}"?`)) return;

    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const response = await fetch(
        `/api/admin/tribes/${encodeURIComponent(initialTribe.slug)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }
      const body = (await response.json()) as { tribe: AdminTribeRecord };
      setStatus(body.tribe.status);
      setMessage("Tribe archived.");
      router.refresh();
    } catch {
      setError("Unable to archive tribe.");
    } finally {
      setPending(false);
    }
  }

  async function handlePermanentDelete() {
    if (!initialTribe) return;
    if (
      !window.confirm(
        `Permanently delete "${initialTribe.name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const response = await fetch(
        `/api/admin/tribes/${encodeURIComponent(initialTribe.slug)}?permanent=1`,
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

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-5">
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

      {mode === "edit" ? (
        <label className="block text-xs uppercase tracking-[0.15em] text-white/45">
          Status
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AdminTribeStatus)
            }
            className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
          >
            {allowedNextStatuses.map((value) => (
              <option key={value} value={value}>
                {TRIBE_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-sm text-white/50">
          New tribes are created as <span className="text-white/80">draft</span>
          . Publish only after review → verified → published.
        </p>
      )}

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

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
        >
          {pending ? "Saving…" : mode === "create" ? "Create tribe" : "Save changes"}
        </button>
        <Link
          href="/admin/tribes"
          className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 hover:border-white/30 hover:text-white"
        >
          Back to list
        </Link>
      </div>

      {mode === "edit" && initialTribe ? (
        <div className="mt-8 space-y-3 border-t border-white/10 pt-6">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            Danger zone
          </p>
          <div className="flex flex-wrap gap-3">
            {status !== "archived" ? (
              <button
                type="button"
                disabled={pending}
                onClick={handleArchive}
                className="rounded-full border border-amber-300/30 px-4 py-2 text-sm text-amber-200 hover:border-amber-200/50 disabled:opacity-60"
              >
                Archive tribe
              </button>
            ) : null}
            {status === "draft" || status === "archived" ? (
              <button
                type="button"
                disabled={pending}
                onClick={handlePermanentDelete}
                className="rounded-full border border-red-400/40 px-4 py-2 text-sm text-red-300 hover:border-red-300/60 disabled:opacity-60"
              >
                Delete permanently
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}
