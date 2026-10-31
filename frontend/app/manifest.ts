
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ki-Khobor × Hornbill 2026",
    short_name: "Ki-Khobor",
    description:
      "Explore the people, morungs, stories, and traditions of the Hornbill Festival.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
    background_color: "#0b0b0b",
    theme_color: "#0b0b0b",
    orientation: "portrait",
    categories: ["travel", "education"],
  };
}
