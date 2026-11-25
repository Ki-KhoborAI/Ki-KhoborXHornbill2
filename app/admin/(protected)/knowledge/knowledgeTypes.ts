export type AdminContentStatus =
  | "draft"
  | "in_review"
  | "verified"
  | "published"
  | "archived";

export type KnowledgeCategory =
  | "festival_overview"
  | "geography_basics"
  | "flora_nature"
  | "adventure_trekking"
  | "handicrafts_handlooms"
  | "music_instruments"
  | "kisama_heritage"
  | "morungs_overview";

export type AdminKnowledgeRecord = {
  id: string;
  slug: string;
  category: KnowledgeCategory;
  title: string;
  subtitle: string | null;
  content: string | null;
  source: string | null;
  status: AdminContentStatus;
  hasAttributes: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export const STATUS_LABELS: Record<AdminContentStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  verified: "Verified",
  published: "Published",
  archived: "Archived",
};

export const STATUS_TRANSITIONS: Record<
  AdminContentStatus,
  readonly AdminContentStatus[]
> = {
  draft: ["in_review", "archived"],
  in_review: ["draft", "verified", "archived"],
  verified: ["in_review", "published", "archived"],
  published: ["archived", "in_review"],
  archived: ["draft"],
};

export const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  festival_overview: "Festival overview",
  geography_basics: "Geography basics",
  flora_nature: "Flora & nature",
  adventure_trekking: "Adventure & trekking",
  handicrafts_handlooms: "Handicrafts & handlooms",
  music_instruments: "Music & instruments",
  kisama_heritage: "Kisama heritage",
  morungs_overview: "Morungs overview",
};

export const ALL_CATEGORIES = Object.keys(
  CATEGORY_LABELS
) as KnowledgeCategory[];

export type KnowledgeFormValues = {
  title: string;
  slug: string;
  category: KnowledgeCategory;
  subtitle: string;
  content: string;
  source: string;
};

export type KnowledgeModuleConfig = {
  /** URL prefix for list/new/edit links, e.g. /admin/knowledge */
  basePath: string;
  /** Human label for the module */
  title: string;
  description: string;
  /** When set, list/create/edit are locked to this knowledge category */
  lockedCategory?: KnowledgeCategory;
  newLabel: string;
};

export function knowledgeToFormValues(
  item: AdminKnowledgeRecord
): KnowledgeFormValues {
  return {
    title: item.title ?? "",
    slug: item.slug ?? "",
    category: item.category,
    subtitle: item.subtitle ?? "",
    content: item.content ?? "",
    source: item.source ?? "",
  };
}

export function emptyKnowledgeFormValues(
  lockedCategory?: KnowledgeCategory
): KnowledgeFormValues {
  return {
    title: "",
    slug: "",
    category: lockedCategory ?? "festival_overview",
    subtitle: "",
    content: "",
    source: "",
  };
}

export async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error || "Request failed.";
}

export function categoryQuery(lockedCategory?: KnowledgeCategory): string {
  return lockedCategory
    ? `?category=${encodeURIComponent(lockedCategory)}`
    : "";
}
