export type EventCategorySlug =
  | "imagi-nation"
  | "cultural-programmes"
  | "exhibitions-competitions"
  | "across-nagaland";

export type EventCategory = {
  slug: EventCategorySlug;
  title: string;
  image: string;
  description: string;
  cardDescription?: string;
  welcomeLabel?: string;
  heroEyebrow?: string;
  heroMetadata?: string;
  aboutTitle?: string;
  about?: string;
  suggestedQuestions: string[];
};

export const eventCategories: Record<EventCategorySlug, EventCategory> = {
  "imagi-nation": {
    slug: "imagi-nation",
    title: "Imagi Nation",
    image: "/images/morungs/angami-card.jpg",
    cardDescription: "Art, music and contemporary creative experiences.",
    description:
      "Discover imagi.NATION, a creative platform associated with Hornbill Festival.",
    about:
      "In 2024, imagi.NATION announced the third edition of IMAGISTAGE, scheduled at imagi.LAND in Kisama, focusing on contemporary art, music and creative expression. Details of the 2026 programme will be added as verified information becomes available.",
    suggestedQuestions: [
      "What information is available about Imagi Nation?",
      "Are Imagi Nation artist lineup details available?",
      "Is an Imagi Nation performance schedule available?",
      "What was IMAGISTAGE?",
      "Where was imagi.LAND located?",
      "Is the 2026 imagi.NATION programme confirmed?",
    ],
  },
  "cultural-programmes": {
    slug: "cultural-programmes",
    title: "Cultural Programmes",
    image: "/images/events/cultural-programmes.webp",
    cardDescription:
      "Traditional dances, folk songs and cultural performances from across Nagaland.",
    welcomeLabel: "Welcome",
    description:
      "Explore the traditional performances and cultural expressions showcased during Hornbill Festival.",
    aboutTitle: "About Cultural Programmes",
    about:
      "For Hornbill Festival 2026, the Department of Art & Culture has announced daily performances by 18 cultural troupes from across Nagaland at Unity Plaza, Kisama. The programme includes folk dances, songs, indigenous games, traditional ritual demonstrations and folk dramas.",
    suggestedQuestions: [
      "What cultural performances are happening at Hornbill?",
      "Which cultural troupes are participating?",
      "What traditional dances will be performed?",
      "Are there indigenous games and demonstrations?",
      "What's the cultural programme schedule for Day 1?",
      "Show me the daily performance timings.",
    ],
  },
  "exhibitions-competitions": {
    slug: "exhibitions-competitions",
    title: "Exhibitions & Competitions",
    image: "/images/events/exhibitions-competitions.webp",
    cardDescription: "Explore visual art, historical archives and creative works.",
    welcomeLabel: "Welcome",
    description:
      "Discover the art, history and archival collections featured during Hornbill Festival.",
    aboutTitle: "About Exhibitions & Competitions",
    about:
      "The Department of Art & Culture will organise the annual Hornbill Festival Art Exhibition-cum-Fair at the Exhibition Hall on the lower floor of the 2nd World War Museum Complex, Kisama, alongside the separate archival exhibition 'Colonial Inroads & Resistance (1832–1947)'. Visitors can also explore departmental publications and the World War-II Museum's collection of historical artefacts.",
    suggestedQuestions: [
      "What exhibitions can I visit at Kisama?",
      "Where is the Hornbill Festival Art Exhibition-cum-Fair?",
      "What is Colonial Inroads & Resistance about?",
      "What historical publications will be available?",
      "What are the World War-II Museum timings?",
      "Are any competitions scheduled for Hornbill 2026?",
    ],
  },
  "across-nagaland": {
    slug: "across-nagaland",
    title: "Events Across Nagaland",
    image: "/images/events/events-across-nagaland.webp",
    cardDescription:
      "Discover festivals, village experiences and cultural events across Nagaland.",
    welcomeLabel: "Welcome",
    heroEyebrow: "Nagaland experiences",
    heroMetadata: "Tourism Nagaland · Event listings",
    description:
      "Go beyond Kisama and discover more of Nagaland during the Hornbill Festival season.",
    aboutTitle: "About Events Across Nagaland",
    about:
      "The Hornbill Festival Mon Extension is scheduled at the Konyak Heritage Complex, Mon, from 8–10 December 2026. Separately, the Tourism Nagaland calendar lists the People's Festival at Khezhakeno and the Kapamodzü and Zhavame Village experience.",
    suggestedQuestions: [
      "What events are happening outside Kisama?",
      "Tell me about the Hornbill Festival Mon Extension.",
      "What can I experience at Khezhakeno?",
      "Tell me about the Zhavame Village experience.",
      "What festivals are happening in other districts?",
      "Show me events happening from December 1–10.",
    ],
  },
};
