import type { LocationSource, VerificationStatus } from "./locations";

export type ExploreCategory = {
  id: string;
  name: string;
  description: string;
  source: LocationSource[];
  verificationStatus: VerificationStatus;
  workbookReviewStatuses: ("Extracted - Needs Review" | "Not Started")[];
};

const workbook = "Ki-Khobor People & Culture workbook";

function category(
  id: string,
  name: string,
  sheet: string,
  references: string[],
  workbookReviewStatuses: ExploreCategory["workbookReviewStatuses"] = [
    "Extracted - Needs Review",
  ]
): ExploreCategory {
  return {
    id,
    name,
    description: "More verified information coming soon.",
    source: references.map((reference) => ({
      label: `${workbook} · ${sheet}`,
      reference: `Hornbill Festival 2025 Final Handbook, ${reference}`,
      verificationStatus: "needs-review",
      reviewStatus: "Extracted - Needs Review",
    })),
    verificationStatus: "needs-review",
    workbookReviewStatuses,
  };
}

export const exploreCategories: ExploreCategory[] = [
  category("nagaland-basics", "Nagaland Basics", "Nagaland Basics", [
    "PDF idx 5-7, 9, 16",
  ], ["Extracted - Needs Review", "Not Started"]),
  category("festival-overview", "Festival Overview", "Festival Overview", [
    "PDF idx 3-4",
    "PDF idx 60",
  ], ["Extracted - Needs Review", "Not Started"]),
  category("flora-nature", "Flora & Nature", "Flora & Nature", [
    "PDF idx 5, 55",
    "PDF idx 22, 50, 166",
  ]),
  category("adventure-trekking", "Adventure & Trekking", "Adventure & Trekking", [
    "PDF idx 54-55",
    "PDF idx 96, 99",
  ]),
  category(
    "handicrafts-handlooms",
    "Handicrafts & Handlooms",
    "Handicrafts & Handlooms",
    ["PDF idx 83, 87, 94", "PDF idx 89, 93"]
  ),
  category("music-instruments", "Music & Instruments", "Music & Instruments", [
    "PDF idx 59",
    "PDF idx 15-16",
  ]),
  category(
    "hornbill-kisama",
    "Hornbill Festival & Kisama",
    "Hornbill Festival & Kisama",
    ["PDF idx 58, 60", "PDF idx 55", "PDF idx 62, 100"]
  ),
];
