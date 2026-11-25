import {
  FESTIVAL_KNOWLEDGE_CATEGORY,
  MORUNG_KNOWLEDGE_CATEGORY,
} from "../../../../lib/admin/knowledge";
import type { KnowledgeModuleConfig } from "./knowledgeTypes";

export const KNOWLEDGE_MODULE: KnowledgeModuleConfig = {
  basePath: "/admin/knowledge",
  title: "Knowledge",
  description:
    "Search and maintain knowledge base items across festival, geography, culture, and heritage categories.",
  newLabel: "New knowledge item",
};

export const FESTIVALS_MODULE: KnowledgeModuleConfig = {
  basePath: "/admin/festivals",
  title: "Festivals",
  description:
    "Festival overview records from the knowledge base. Unverified dates should not be treated as official without editorial approval.",
  lockedCategory: FESTIVAL_KNOWLEDGE_CATEGORY,
  newLabel: "New festival item",
};

export const MORUNGS_MODULE: KnowledgeModuleConfig = {
  basePath: "/admin/morungs",
  title: "Morungs",
  description:
    "Morung overview records and cultural details from the knowledge base.",
  lockedCategory: MORUNG_KNOWLEDGE_CATEGORY,
  newLabel: "New morung item",
};
