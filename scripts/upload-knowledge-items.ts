import { connectToDatabase, closeDatabase } from '../lib/db.js';

const rawData = [
  {
    "slug": "what-the-hornbill-festival-is",
    "category": "festival_overview",
    "title": "What the Hornbill Festival is",
    "subtitle": null,
    "content": "The Hornbill Festival - fondly known as the Festival of Festivals - is an annual celebration held in the first week of December at Kisama, Naga Heritage Village, about 12 km from Kohima. A modern-day cultural extravaganza of all Naga tribes, featuring cultural performances, Hornbill Music Festival, traditional sports, food festivals, craft sales, and more.",
    "attributes": {},
    "source": "Hornbill Festival 2025 Final Handbook, p. PDF idx 3-4",
    "status": "draft",
    "metadata": {
      "sourceWorkbook": "Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx",
      "sourceWorksheet": "Festival Overview",
      "sourceRow": 2,
      "importedAt": new Date("2026-10-31T00:00:00.000Z"),
      "rawSourceStatus": "Extracted - Needs Review",
      "sourceCitation": "Hornbill Festival 2025 Final Handbook, p. PDF idx 3-4",
      "notes": null
    },
    "createdAt": new Date("2026-10-31T00:00:00.000Z"),
    "updatedAt": new Date("2026-10-31T00:00:00.000Z")
  },
  {
    "slug": "purpose-of-the-festival",
    "category": "festival_overview",
    "title": "Purpose of the festival",
    "subtitle": null,
    "content": "The Hornbill Festival was established by the Government of Nagaland with four primary objectives:  1. Cultural Preservation and Revival\nBefore the festival's establishment in 2000, many ancient oral traditions, folk music, ritual dances, and indigenous craftsmanship were at risk of fading as younger generations modernized. The festival creates a dedicated annual stage to document, preserve, and pass down this living heritage to future generations. 2. Promoting Inter-Tribal Unity and Interaction\nNagaland is home to over 18 major tribes (and numerous sub-tribes), each with its own distinct language, customs, attire, and local harvest festivals. The Hornbill Festival brings all these diverse communities together under a single umbrella—earning it the title \"Festival of Festivals\". It fosters cross-cultural dialogue, unity, and mutual respect among tribes that historically lived in isolated hill tracts.  3. Boosting Tourism and Economic Opportunities\nThe festival serves as Nagaland's primary tourism promotional event. By showcasing the state’s vibrant culture on a global stage, it attracts thousands of domestic and international visitors. This generates sustainable income for local communities, including hospitality providers, artisans, weavers, musicians, tour operators, and food vendors.  4. Bridging Traditional Heritage with Contemporary Expression\nWhile anchored in ancient customs—such as indigenous sports, tribal village life inside traditional wooden huts (Morungs), and folk performances—the festival also embraces modern youth culture. Host events like the Hornbill International Rock Concert, fashion shows, and art exhibitions showcase contemporary Naga talent alongside traditional roots.",
    "attributes": {},
    "source": "Hornbill Festival 2025 Final Handbook, and open Source Internet.",
    "status": "draft",
    "metadata": {
      "sourceWorkbook": "Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx",
      "sourceWorksheet": "Festival Overview",
      "sourceRow": 3,
      "importedAt": new Date("2026-10-31T00:00:00.000Z"),
      "rawSourceStatus": "Extracted - Needs Review",
      "sourceCitation": "Hornbill Festival 2025 Final Handbook, and open Source Internet.",
      "notes": null
    },
    "createdAt": new Date("2026-10-31T00:00:00.000Z"),
    "updatedAt": new Date("2026-10-31T00:00:00.000Z")
  },
  {
    "slug": "history-and-how-it-began",
    "category": "festival_overview",
    "title": "History and how it began",
    "subtitle": null,
    "content": "The Backdrop: Nagaland in the Late 1990s.  By the late 1990s, Nagaland was emerging from decades of political unrest and isolation. While the state possessed an immensely rich, vibrant cultural heritage, passed down orally and preserved across isolated hill tracts by over 16 distinct Naga tribes, there was a growing concern that this unique heritage was slipping away.\nThe Generational Gap: Modernization, changing lifestyles, and the influence of western education meant younger generations were losing touch with traditional dialects, folk songs, weaving, and indigenous crafts.\nLack of a Unified Platform: While individual tribes had their own major seasonal celebrations (such as the Sekrenyi of the Angami or Moatsu of the Ao), there was no common platform where all Naga tribes could gather to celebrate their shared identity.\nEconomic Isolation: Tourism to the state was minimal due to past infrastructure and security challenges, meaning local artisans and entrepreneurs had very few avenues to showcase their work to the outside world.  How It Began: December 2000. To address these challenges, the Government of Nagaland, under the leadership of then-Chief Minister Scato Swu and various cultural stakeholders, conceptualized a mega-event.\nThe Vision: They envisioned a single, grand festival that would showcase the totality of Naga culture, foster harmony and integration among the different tribes, and open the state's doors to tourism.\nThe Name: It was named the Hornbill Festival after the Indian hornbill, a majestic, highly revered bird deeply symbolic in Naga folklore, songs, and warrior headgear, representing qualities of nobility, beauty, and alertness.\nThe Inception: The very first Hornbill Festival was held from December 1 to December 10, 2000, coinciding neatly with Nagaland Statehood Day (December 1).  Evolution into the \"Festival of Festivals\".  What started as a modest state-sponsored cultural meet quickly snowballed into a massive global phenomenon:\nThe Shift to Kisama: As attendance surged in the early years, the government established the Naga Heritage Village at Kisama (about 12 km from Kohima) specifically as the permanent venue. Modeled after traditional Naga village layouts complete with authentic Morungs (youth dormitories) for each tribe, Kisama gave the festival an immersive, authentic atmosphere.\nGlobal Reach: Over the decades, the festival expanded far beyond tribal dances to incorporate the Hornbill International Rock Contest, art installations, international music acts, literature festivals, and global food pavilions.\nToday, what began as a local initiative to preserve fading traditions has successfully transformed into one of South Asia's most famous cultural tourism events, putting Nagaland firmly on the global cultural map.",
    "attributes": {},
    "source": "Hornbill Festival 2025 Final Handbook, and open Source Internet.",
    "status": "draft",
    "metadata": {
      "sourceWorkbook": "Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx",
      "sourceWorksheet": "Festival Overview",
      "sourceRow": 4,
      "importedAt": new Date("2026-10-31T00:00:00.000Z"),
      "rawSourceStatus": "Extracted - Needs Review",
      "sourceCitation": "Hornbill Festival 2025 Final Handbook, and open Source Internet.",
      "notes": null
    },
    "createdAt": new Date("2026-10-31T00:00:00.000Z"),
    "updatedAt": new Date("2026-10-31T00:00:00.000Z")
  },
  {
    "slug": "cultural-significance",
    "category": "festival_overview",
    "title": "Cultural significance",
    "subtitle": null,
    "content": "1. Living Preservation of Naga Heritage.  Oral Tradition Safeguard: Naga history was never written; it was passed down through songs, stories, and rituals. The festival provides an annual living archive where folk songs, war dances, and ancient rituals are performed and kept alive for younger generations.\nSymbol of the Hornbill: Named after the revered bird deeply woven into Naga folklore, the festival honors the bird’s symbolic traits grandeur, alertness, and beauty, which are reflected in traditional headgear, attire, and art.  2. A Unifying Platform (\"Festival of Festivals\").  Inter-Tribal Harmony: Nagaland comprises over 18 distinct tribes with different dialects and traditions. The festival acts as a single, neutral ground where all tribes gather, fostering unity, mutual respect, and cross-cultural understanding.\nAuthentic Morung Culture: At the Kisama Heritage Village, each tribe builds its own traditional Morung (youth dormitory), displaying its unique architecture, wood carvings, and customs side-by-side.  3. Global Identity and Pride.   Cultural Reclaiming: It shifts the state's global narrative toward its vibrant heritage, craftsmanship, and hospitality.\nBridging Generations: By combining traditional tribal practices with modern music, art, and fashion, it allows young Nagas to celebrate their ancestral roots while expressing contemporary identity.",
    "attributes": {},
    "source": "Hornbill Festival 2025 Final Handbook, and open Source Internet.",
    "status": "draft",
    "metadata": {
      "sourceWorkbook": "Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx",
      "sourceWorksheet": "Festival Overview",
      "sourceRow": 5,
      "importedAt": new Date("2026-10-31T00:00:00.000Z"),
      "rawSourceStatus": "Extracted - Needs Review",
      "sourceCitation": "Hornbill Festival 2025 Final Handbook, and open Source Internet.",
      "notes": null
    },
    "createdAt": new Date("2026-10-31T00:00:00.000Z"),
    "updatedAt": new Date("2026-10-31T00:00:00.000Z")
  },
  {
    "slug": "meaning-of-the-name-hornbill",
    "category": "festival_overview",
    "title": "Meaning of the name \"Hornbill\"",
    "subtitle": null,
    "content": "The Hornbill is a revered bird in Naga culture, featuring prominently in the traditional headdresses and regalia of many tribes. The festival is named after this bird to honour its cultural significance across Nagaland.",
    "attributes": {},
    "source": "Hornbill Festival 2025 Final Handbook, p. PDF idx 3-4",
    "status": "draft",
    "metadata": {
      "sourceWorkbook": "Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx",
      "sourceWorksheet": "Festival Overview",
      "sourceRow": 6,
      "importedAt": new Date("2026-10-31T00:00:00.000Z"),
      "rawSourceStatus": "Extracted - Needs Review",
      "sourceCitation": "Hornbill Festival 2025 Final Handbook, p. PDF idx 3-4",
      "notes": null
    },
    "createdAt": new Date("2026-10-31T00:00:00.000Z"),
    "updatedAt": new Date("2026-10-31T00:00:00.000Z")
  },
  {
    "slug": "who-organises-it",
    "category": "festival_overview",
    "title": "Who organises it",
    "subtitle": null,
    "content": "The Hornbill Festival is primarily organized by the State Government of Nagaland.\nExecutively, the execution and festival management are handled through a joint inter-departmental effort led by government bodies alongside local tribal councils:  Key Organizers & Apex Governing Body.  1. High-Powered Governing Body (Apex Policy Body)  The Government of Nagaland constituted a dedicated High-Powered Governing Body to oversee and direct the festival.\nChairperson: Hon'ble Chief Minister of Nagaland.\nKey Members: Deputy Chief Ministers, Cabinet Ministers (Tourism, Horticulture), Advisors for Art & Culture and Industries/Commerce, the Chief Secretary (Member Secretary), and Departmental Secretaries.\nRole: Sets the overall strategic vision, policy guidelines, event approvals, site allotments, rate monitoring, and corporate/CSR sponsorships.  2. Nodal Government Departments (Operations)  Department of Tourism: Acts as the primary operational nodal agency for international and domestic tourism promotion, logistics, event scheduling, and hospitality management.\nDepartment of Art & Culture: Manages the authentic presentation of tribal traditions, folk music, ritual dances, literature, and cultural troupe coordination.\nTask Force for Music & Arts (TaFMA): Coordinates musical events, concerts, and youth art exhibitions associated with the festival.  3. Tribal Bodies & Local Communities  Naga Tribal Councils (Apex Tribal Bodies): Each participating tribe’s governing council organizes and manages its respective traditional Morung (youth dormitory) at Kisama Heritage Village.\nLocal Entrepreneurs & Guilds: Local youth groups, artisans, weavers, and culinary associations manage food stalls, craft markets, night carnivals, and transport services in Kohima and Kisama.  4. Supporting Agencies  Ministry of Tourism & Ministry of Culture (Government of India): Provides central backing, funding support, and national promotional outreach.",
    "attributes": {},
    "source": "Open Source Internet",
    "status": "draft",
    "metadata": {
      "sourceWorkbook": "Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx",
      "sourceWorksheet": "Festival Overview",
      "sourceRow": 7,
      "importedAt": new Date("2026-10-31T00:00:00.000Z"),
      "rawSourceStatus": "Not Started",
      "sourceCitation": "Open Source Internet",
      "notes": null
    },
    "createdAt": new Date("2026-10-31T00:00:00.000Z"),
    "updatedAt": new Date("2026-10-31T00:00:00.000Z")
  },
  {
    "slug": "introduction-to-nagaland-for-visitors",
    "category": "festival_overview",
    "title": "Introduction to Nagaland for visitors",
    "subtitle": null,
    "content": "Nagaland, often called the \"Land of Festivals,\" is a mountainous state in Northeast India. It is celebrated for its dramatic landscapes, rich indigenous heritage, and warm tribal hospitality.   Key Facts at a Glance:  Capital: Kohima.   Entry Hub: Dimapur (the state's primary airport and railhead).  Official Language: English (Nagamese is widely spoken as the lingua franca).  Core Attractions & Highlights.  Rich Tribal Diversity: Home to over 18 major indigenous tribes (such as the Angami, Ao, Konyak, and Sumi). Each has distinct languages, traditions, vibrant handlooms, and seasonal harvest festivals.    Scenic Trails & Nature: Famous for the Dzüko Valley, trekker's paradise known for rolling green hills and endemic lilies, and Japfü Peak, the state's second-highest summit.   History & Eco-Tourism: Home to Khonoma, India’s first designated green village with a history of British-era resistance, and the Kohima War Cemetery from World War II.   Cuisine: Known for smoked meats, bamboo shoot preparations, local organic greens, and spicy chili varieties (like the Raja Mircha / Ghost Pepper).  Traveler Tip: Domestic Indian tourists require an Inner Line Permit (ILP), while foreign nationals must complete e-FRRO registration prior to entering the state.",
    "attributes": {},
    "source": "Open Source Internet",
    "status": "draft",
    "metadata": {
      "sourceWorkbook": "Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx",
      "sourceWorksheet": "Festival Overview",
      "sourceRow": 8,
      "importedAt": new Date("2026-10-31T00:00:00.000Z"),
      "rawSourceStatus": "Not Started",
      "sourceCitation": "Open Source Internet",
      "notes": null
    },
    "createdAt": new Date("2026-10-31T00:00:00.000Z"),
    "updatedAt": new Date("2026-10-31T00:00:00.000Z")
  },
  {
    "slug": "duration-and-dates",
    "category": "festival_overview",
    "title": "Duration and dates",
    "subtitle": null,
    "content": "The Hornbill Festival 2026 runs for 10 days, from 1st to 10th December 2026.",
    "attributes": {},
    "source": "Open Source Internet",
    "status": "draft",
    "metadata": {
      "sourceWorkbook": "Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx",
      "sourceWorksheet": "Festival Overview",
      "sourceRow": 9,
      "importedAt": new Date("2026-10-31T00:00:00.000Z"),
      "rawSourceStatus": "Extracted - Needs Review",
      "sourceCitation": "Open Source Internet",
      "notes": null
    },
    "createdAt": new Date("2026-10-31T00:00:00.000Z"),
    "updatedAt": new Date("2026-10-31T00:00:00.000Z")
  },
  {
    "slug": "location",
    "category": "festival_overview",
    "title": "Location",
    "subtitle": null,
    "content": "Naga Heritage Village, Kisama, approximately 12 km from Kohima, Nagaland.",
    "attributes": {},
    "source": "Hornbill Festival 2025 Final Handbook, p. PDF idx 60",
    "status": "draft",
    "metadata": {
      "sourceWorkbook": "Ki-Khobor_Hornbill_2026_People_Culture_Extracted.xlsx",
      "sourceWorksheet": "Festival Overview",
      "sourceRow": 10,
      "importedAt": new Date("2026-10-31T00:00:00.000Z"),
      "rawSourceStatus": "Extracted - Needs Review",
      "sourceCitation": "Hornbill Festival 2025 Final Handbook, p. PDF idx 60",
      "notes": null
    },
    "createdAt": new Date("2026-10-31T00:00:00.000Z"),
    "updatedAt": new Date("2026-10-31T00:00:00.000Z")
  }
];

async function main() {
  console.log('Connecting to database...');
  const db = await connectToDatabase(process.env.MONGODB_URI);
  const collection = db.collection('knowledge_items');

  console.log(`Starting upload of ${rawData.length} items to 'knowledge_items'...`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const item of rawData) {
    const result = await collection.updateOne(
      { slug: item.slug },
      { $set: item },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      insertedCount++;
      console.log(`➕ Inserted: ${item.slug} ("${item.title}")`);
    } else if (result.modifiedCount > 0) {
      updatedCount++;
      console.log(`🔄 Updated: ${item.slug} ("${item.title}")`);
    } else {
      console.log(`✔ Unchanged: ${item.slug} ("${item.title}")`);
    }
  }

  const totalCount = await collection.countDocuments();
  console.log(`\nUpload complete!`);
  console.log(`- Inserted : ${insertedCount}`);
  console.log(`- Updated  : ${updatedCount}`);
  console.log(`- Total docs in 'knowledge_items': ${totalCount}`);

  await closeDatabase();
}

main().catch(async (err) => {
  console.error('Upload failed:', err);
  await closeDatabase();
  process.exit(1);
});
