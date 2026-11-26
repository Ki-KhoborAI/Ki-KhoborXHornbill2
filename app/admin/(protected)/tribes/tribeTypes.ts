export type AdminTribeStatus =
  | "draft"
  | "in_review"
  | "verified"
  | "published"
  | "archived";

export type AdminTribeRecord = {
  id: string;
  slug: string;
  name: string;
  regionOrDistricts: string | null;
  traditionalFestivalName: string | null;
  festivalDateOrSeason: string | null;
  traditions: string | null;
  traditionalAttire: string | null;
  culturalSignificance: string | null;
  source: string | null;
  status: AdminTribeStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export const TRIBE_STATUS_LABELS: Record<AdminTribeStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  verified: "Verified",
  published: "Published",
  archived: "Archived",
};

export const TRIBE_STATUS_TRANSITIONS: Record<
  AdminTribeStatus,
  readonly AdminTribeStatus[]
> = {
  draft: ["in_review", "archived"],
  in_review: ["draft", "verified", "archived"],
  verified: ["in_review", "published", "archived"],
  published: ["archived", "in_review"],
  archived: ["draft"],
};

/**
 * Legal one-step advance toward published (empty when already published/archived).
 * Matches server CONTENT_STATUS_TRANSITIONS — do not skip steps client-side alone.
 */
export function nextForwardStatus(
  status: AdminTribeStatus
): AdminTribeStatus | null {
  if (status === "draft") return "in_review";
  if (status === "in_review") return "verified";
  if (status === "verified") return "published";
  return null;
}

/** Ordered steps from current status up to published (exclusive of current). */
export function pathToPublished(
  status: AdminTribeStatus
): AdminTribeStatus[] {
  const path: AdminTribeStatus[] = [];
  let current: AdminTribeStatus | null = status;
  while (current && current !== "published") {
    const next = nextForwardStatus(current);
    if (!next) break;
    path.push(next);
    current = next;
  }
  return path;
}

export type TribeFormValues = {
  name: string;
  slug: string;
  regionOrDistricts: string;
  traditionalFestivalName: string;
  festivalDateOrSeason: string;
  traditions: string;
  traditionalAttire: string;
  culturalSignificance: string;
  source: string;
};

export function tribeToFormValues(tribe: AdminTribeRecord): TribeFormValues {
  return {
    name: tribe.name ?? "",
    slug: tribe.slug ?? "",
    regionOrDistricts: tribe.regionOrDistricts ?? "",
    traditionalFestivalName: tribe.traditionalFestivalName ?? "",
    festivalDateOrSeason: tribe.festivalDateOrSeason ?? "",
    traditions: tribe.traditions ?? "",
    traditionalAttire: tribe.traditionalAttire ?? "",
    culturalSignificance: tribe.culturalSignificance ?? "",
    source: tribe.source ?? "",
  };
}

export function emptyTribeFormValues(): TribeFormValues {
  return {
    name: "",
    slug: "",
    regionOrDistricts: "",
    traditionalFestivalName: "",
    festivalDateOrSeason: "",
    traditions: "",
    traditionalAttire: "",
    culturalSignificance: "",
    source: "",
  };
}

export async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error || "Request failed.";
}
