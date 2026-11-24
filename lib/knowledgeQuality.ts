/**
 * Offline knowledge-base data-quality helpers for Phase 3 audit rules.
 * Does not invent cultural facts — only classifies / sanitises existing text.
 */

/** Text that is safe to surface to visitors (not null/corrupt/placeholder). */
export function isUsableKnowledgeText(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("[object Object]")) return false;
  return true;
}

export function usableKnowledgeText(value: unknown): string | undefined {
  return isUsableKnowledgeText(value) ? value.trim() : undefined;
}

export type KnowledgeClaimCertainty =
  | "unconfirmed"
  | "handbook_documented"
  | "typical_window_unconfirmed_for_2026"
  | "missing_needs_research";

export type KnowledgeVerificationStatus =
  | "unverified"
  | "historical"
  | "needs_research"
  | "adequate";

/** Festival date record that must not be treated as confirmed 2026. */
export const UNVERIFIED_DURATION_RECORD_ID = "duration-and-dates";

/** Handbook-documented 2025 edition dates (historical only). */
export const HISTORICAL_2025_DATES_RECORD_ID =
  "kisama-heritage-2025-edition-details-hornbill-festival-2025-dates";

export function getAttributeString(
  attributes: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  return usableKnowledgeText(attributes?.[key]);
}

export function getVerificationStatus(
  attributes: Record<string, unknown> | undefined
): KnowledgeVerificationStatus | undefined {
  const value = attributes?.verificationStatus;
  if (
    value === "unverified" ||
    value === "historical" ||
    value === "needs_research" ||
    value === "adequate"
  ) {
    return value;
  }
  return undefined;
}

export function requiresOfficialConfirmation(
  attributes: Record<string, unknown> | undefined
): boolean {
  return attributes?.requiresOfficialConfirmation === true;
}

export function isHistoricalEditionRecord(
  id: string,
  title: string,
  attributes?: Record<string, unknown>
): boolean {
  if (attributes?.editionYear === 2025) return true;
  if (attributes?.notApplicableAsConfirmed2026 === true) return true;
  if (getVerificationStatus(attributes) === "historical") return true;
  const blob = `${id} ${title}`.toLowerCase();
  return /\b2025\b/.test(blob) && /date|edition|hornbill/.test(blob);
}

/**
 * Score adjustment for FACTUAL_DATES / when-queries so prior-edition
 * handbook cards do not outrank the current unverified-duration guidance
 * unless the visitor explicitly asks about 2025.
 */
export function festivalDateContextScoreAdjustment(options: {
  id: string;
  title: string;
  category?: string;
  queryLower: string;
  attributes?: Record<string, unknown>;
}): number {
  const { id, title, category, queryLower, attributes } = options;
  let delta = 0;

  if (id === UNVERIFIED_DURATION_RECORD_ID || id.endsWith("duration-and-dates")) {
    delta += 90;
  }

  if (category === "festival_overview" && /date|duration|when/i.test(`${id} ${title}`)) {
    delta += 40;
  }

  const asks2025 = /\b2025\b/.test(queryLower);
  if (!asks2025 && isHistoricalEditionRecord(id, title, attributes)) {
    delta -= 120;
  }

  if (asks2025 && id === HISTORICAL_2025_DATES_RECORD_ID) {
    delta += 160;
  }

  if (requiresOfficialConfirmation(attributes) && !asks2025) {
    // Keep unconfirmed current-year guidance visible, but not overconfident.
    delta += 10;
  }

  return delta;
}
