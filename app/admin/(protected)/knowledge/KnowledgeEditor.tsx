"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_TRANSITIONS,
  categoryQuery,
  emptyKnowledgeFormValues,
  knowledgeToFormValues,
  readApiError,
  type AdminContentStatus,
  type AdminKnowledgeRecord,
  type KnowledgeFormValues,
  type KnowledgeModuleConfig,
} from "./knowledgeTypes";

type Mode = "create" | "edit";

export default function KnowledgeEditor({
  mode,
  config,
  initialItem = null,
}: {
  mode: Mode;
  config: KnowledgeModuleConfig;
  initialItem?: AdminKnowledgeRecord | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<KnowledgeFormValues>(
    initialItem
      ? knowledgeToFormValues(initialItem)
      : emptyKnowledgeFormValues(config.lockedCategory)
  );
  const [savedStatus, setSavedStatus] = useState<AdminContentStatus>(
    initialItem?.status ?? "draft"
  );
  const [status, setStatus] = useState<AdminContentStatus>(
    initialItem?.status ?? "draft"
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Options must come from the last saved status — not the pending dropdown
  // value — or users can select draft→verified/published and the API rejects it.
  const allowedNextStatuses = useMemo(() => {
    if (mode === "create") return [] as AdminContentStatus[];
    return Array.from(
      new Set<AdminContentStatus>([
        savedStatus,
        ...STATUS_TRANSITIONS[savedStatus],
      ])
    );
  }, [mode, savedStatus]);

  const apiCategorySuffix = categoryQuery(config.lockedCategory);

  function updateField<K extends keyof KnowledgeFormValues>(
    key: K,
    value: KnowledgeFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    try {
      const payload = {
        title: values.title.trim(),
        slug: values.slug.trim() || undefined,
        category: config.lockedCategory ?? values.category,
        subtitle: values.subtitle,
        content: values.content,
        source: values.source,
        ...(mode === "edit" ? { status } : {}),
      };

      const response =
        mode === "create"
          ? await fetch(`/api/admin/knowledge${apiCategorySuffix}`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(
              `/api/admin/knowledge/${encodeURIComponent(initialItem!.slug)}${apiCategorySuffix}`,
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

      const body = (await response.json()) as { item: AdminKnowledgeRecord };
      setStatus(body.item.status);
      setSavedStatus(body.item.status);
      setMessage(mode === "create" ? "Item created." : "Item saved.");
      router.replace(
        `${config.basePath}/${encodeURIComponent(body.item.slug)}`
      );
      router.refresh();
    } catch {
      setError("Unable to save knowledge item.");
    } finally {
      setPending(false);
    }
  }

  async function handleArchive() {
    if (!initialItem) return;
    if (!window.confirm(`Archive "${initialItem.title}"?`)) return;

    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const response = await fetch(
        `/api/admin/knowledge/${encodeURIComponent(initialItem.slug)}${apiCategorySuffix}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }
      const body = (await response.json()) as { item: AdminKnowledgeRecord };
      setStatus(body.item.status);
      setSavedStatus(body.item.status);
      setMessage("Item archived.");
      router.refresh();
    } catch {
      setError("Unable to archive item.");
    } finally {
      setPending(false);
    }
  }

  async function handlePermanentDelete() {
    if (!initialItem) return;
    if (
      !window.confirm(
        `Permanently delete "${initialItem.title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const joiner = apiCategorySuffix ? "&" : "?";
      const response = await fetch(
        `/api/admin/knowledge/${encodeURIComponent(initialItem.slug)}${apiCategorySuffix}${joiner}permanent=1`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        setError(await readApiError(response));
        return;
      }
      router.replace(config.basePath);
      router.refresh();
    } catch {
      setError("Unable to delete item.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 max-w-3xl space-y-5 pb-28 sm:mt-6 sm:pb-8"
    >
      <label className="block text-xs uppercase tracking-[0.15em] text-white/45">
        Title
        <input
          value={values.title}
          onChange={(event) => updateField("title", event.target.value)}
          required
          className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
        />
      </label>

      <label className="block text-xs uppercase tracking-[0.15em] text-white/45">
        Slug (optional on create)
        <input
          value={values.slug}
          onChange={(event) => updateField("slug", event.target.value)}
          className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
        />
      </label>

      {config.lockedCategory ? (
        <p className="text-sm text-white/50">
          Category locked to{" "}
          <span className="text-white/80">
            {CATEGORY_LABELS[config.lockedCategory]}
          </span>
          .
        </p>
      ) : (
        <label className="block text-xs uppercase tracking-[0.15em] text-white/45">
          Category
          <select
            value={values.category}
            onChange={(event) =>
              updateField(
                "category",
                event.target.value as KnowledgeFormValues["category"]
              )
            }
            className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
          >
            {ALL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-xs uppercase tracking-[0.15em] text-white/45">
        Subtitle
        <input
          value={values.subtitle}
          onChange={(event) => updateField("subtitle", event.target.value)}
          className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
        />
      </label>

      <label className="block text-xs uppercase tracking-[0.15em] text-white/45">
        Content
        <textarea
          value={values.content}
          onChange={(event) => updateField("content", event.target.value)}
          rows={8}
          className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
        />
      </label>

      <label className="block text-xs uppercase tracking-[0.15em] text-white/45">
        Source
        <textarea
          value={values.source}
          onChange={(event) => updateField("source", event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
        />
      </label>

      {mode === "edit" ? (
        <>
          <label className="block text-xs uppercase tracking-[0.15em] text-white/45">
            Status
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as AdminContentStatus)
              }
              className="mt-2 w-full rounded-lg border border-white/15 bg-[#0b0b0b] px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-white/40"
            >
              {allowedNextStatuses.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          {initialItem?.hasAttributes ? (
            <p className="text-xs text-white/40">
              Imported attributes are preserved and not edited in this form.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-white/50">
          New items are created as <span className="text-white/80">draft</span>.
          Publish only after review → verified → published.
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

      {/* Sticky bottom dock on phone so Save / Archive / Delete stay reachable. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0b0b0b]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:inset-auto sm:mt-2 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
            >
              {pending
                ? "Saving…"
                : mode === "create"
                  ? "Create item"
                  : "Save changes"}
            </button>
            <Link
              href={config.basePath}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 py-2.5 text-sm text-white/70 hover:border-white/30 hover:text-white"
            >
              Back to list
            </Link>
          </div>

          {mode === "edit" && initialItem ? (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {status !== "archived" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleArchive}
                  className="min-h-11 rounded-full border border-amber-300/30 px-4 py-2.5 text-sm text-amber-200 hover:border-amber-200/50 disabled:opacity-60"
                >
                  Archive
                </button>
              ) : null}
              {status === "draft" || status === "archived" ? (
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
          ) : null}
        </div>
      </div>
    </form>
  );
}
