/**
 * Generates a minimal synthetic Excel workbook for importer unit tests.
 * Does not use or copy production handbook content.
 */
import path from "node:path";
import ExcelJS from "exceljs";

const outPath = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "importer-sample.xlsx"
);

function addSheet(workbook, name, headers, rows) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(headers);
  for (const row of rows) {
    sheet.addRow(headers.map((h) => row[h] ?? null));
  }
  return sheet;
}

const workbook = new ExcelJS.Workbook();

addSheet(workbook, "Read Me", ["Instructions"], [
  { Instructions: "Synthetic fixture for automated importer tests only." },
]);

addSheet(workbook, "Missing Information", ["Item", "Notes"], [
  { Item: "Research backlog placeholder", Notes: "Not imported." },
]);

addSheet(
  workbook,
  "The 18 Tribes",
  [
    "Tribe Name",
    "Region or Districts",
    "Traditional Festival Name",
    "Festival Date or Season",
    "Traditions",
    "Traditional Attire",
    "Cultural Significance",
    "Source (name or link)",
    "Status",
    "Notes",
  ],
  [
    {
      "Tribe Name": "Fixture Angami",
      "Region or Districts": "Kohima district",
      "Traditional Festival Name": "Sekrenyi",
      "Festival Date or Season": "February 25",
      Traditions: "Purification and renewal observances.",
      "Traditional Attire": null,
      "Cultural Significance": "Major purification festival of the community.",
      "Source (name or link)": "Synthetic test fixture",
      Status: "draft",
      Notes: null,
    },
    {
      "Tribe Name": "Fixture Ao",
      "Region or Districts": "Mokokchung district",
      "Traditional Festival Name": "Moatsu",
      "Festival Date or Season": "May",
      Traditions: "Post-sowing community celebration.",
      "Traditional Attire": null,
      "Cultural Significance": "Agricultural thanksgiving festival.",
      "Source (name or link)": "Synthetic test fixture",
      Status: "draft",
      Notes: null,
    },
  ]
);

addSheet(
  workbook,
  "Morungs",
  [
    "Morung Name",
    "Architectural Features",
    "Traditional Objects or Displays",
    "Cultural Significance",
    "Information Still Missing",
    "Source (name or link)",
    "Status",
    "Notes",
  ],
  [
    {
      "Morung Name": "Fixture Angami Morung",
      "Architectural Features": "Wood and thatch structure sample.",
      "Traditional Objects or Displays": "Sample spears and drums.",
      "Cultural Significance": "Youth dormitory overview for tests.",
      "Information Still Missing": null,
      "Source (name or link)": "Synthetic test fixture",
      Status: "draft",
      Notes: null,
    },
    {
      "Morung Name": "Fixture Ao Morung",
      "Architectural Features": "Raised platform sample.",
      "Traditional Objects or Displays": "Sample baskets.",
      "Cultural Significance": "Second morung row for count checks.",
      "Information Still Missing": null,
      "Source (name or link)": "Synthetic test fixture",
      Status: "draft",
      Notes: null,
    },
  ]
);

addSheet(
  workbook,
  "Festival Overview",
  ["Topic", "Details", "Source (name or link)", "Status", "Notes"],
  [
    {
      Topic: "What the festival is",
      Details: "Synthetic festival overview detail for importer tests.",
      "Source (name or link)": "Synthetic test fixture",
      Status: "draft",
      Notes: null,
    },
  ]
);

addSheet(
  workbook,
  "Nagaland Basics",
  ["Item", "Category", "Details", "Source (name or link)", "Status", "Notes"],
  [
    {
      Item: "Capital city",
      Category: "Geography",
      Details: "Kohima is the capital of Nagaland.",
      "Source (name or link)": "Synthetic test fixture",
      Status: "draft",
      Notes: null,
    },
  ]
);

addSheet(
  workbook,
  "Flora & Nature",
  [
    "Name",
    "Type",
    "Local Name",
    "Scientific Name (only if verified)",
    "Location",
    "Significance",
    "Source (name or link)",
    "Status",
    "Notes",
  ],
  [
    {
      Name: "Rhododendron",
      Type: "Flower",
      "Local Name": null,
      "Scientific Name (only if verified)": "Rhododendron arboreum",
      Location: "Hill slopes",
      Significance: "Spring blooms across the hills.",
      "Source (name or link)": "Synthetic test fixture",
      Status: "draft",
      Notes: null,
    },
  ]
);

addSheet(
  workbook,
  "Adventure & Trekking",
  [
    "Name",
    "Activity Type",
    "Location",
    "Difficulty",
    "Approximate Duration",
    "Best Season",
    "Safety Information",
    "Source (name or link)",
    "Status",
    "Notes",
  ],
  [
    {
      Name: "Sample Valley Walk",
      "Activity Type": "Trek",
      Location: "Sample hills",
      Difficulty: "Easy",
      "Approximate Duration": "2 hours",
      "Best Season": "October to March",
      "Safety Information": "Carry water and follow marked paths.",
      "Source (name or link)": "Synthetic test fixture",
      Status: "draft",
      Notes: null,
    },
  ]
);

addSheet(
  workbook,
  "Handicrafts & Handlooms",
  [
    "Craft Name",
    "Materials",
    "How It Is Made",
    "Cultural Significance",
    "Where It Is Made or Sold",
    "Artisan Information",
    "Associated Tribe (only if verified)",
    "Source (name or link)",
    "Status",
    "Notes",
  ],
  [
    {
      "Craft Name": "Sample Shawl",
      Materials: "Cotton",
      "How It Is Made": "Handwoven on a loom.",
      "Cultural Significance": "Worn during festivals.",
      "Where It Is Made or Sold": "Local markets",
      "Artisan Information": null,
      "Associated Tribe (only if verified)": null,
      "Source (name or link)": "Synthetic test fixture",
      Status: "draft",
      Notes: null,
    },
  ]
);

addSheet(
  workbook,
  "Music & Instruments",
  [
    "Name",
    "Category",
    "Description",
    "Cultural Significance",
    "Associated Tribe (only if verified)",
    "Source (name or link)",
    "Status",
    "Notes",
  ],
  [
    {
      Name: "Sample Drum",
      Category: "Percussion",
      Description: "Handheld drum used in celebrations.",
      "Cultural Significance": "Marks festival dances.",
      "Associated Tribe (only if verified)": null,
      "Source (name or link)": "Synthetic test fixture",
      Status: "draft",
      Notes: null,
    },
  ]
);

addSheet(
  workbook,
  "Hornbill Festival & Kisama",
  ["Item", "Category", "Details", "Source (name or link)", "Status", "Notes"],
  [
    {
      Item: "Kisama venue",
      Category: "Venue",
      Details: "Naga Heritage Village sample description.",
      "Source (name or link)": "Synthetic test fixture",
      Status: "draft",
      Notes: null,
    },
  ]
);

await workbook.xlsx.writeFile(outPath);
console.log(`Wrote ${outPath}`);
console.log(
  JSON.stringify(
    {
      tribes: 2,
      morungs: 2,
      knowledgeContentSheets: 7,
      expectedKnowledgeItems: 9,
      expectedTotalParsedRows: 11,
    },
    null,
    2
  )
);
