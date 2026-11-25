import KnowledgeNewPage from "../../knowledge/KnowledgeNewPage";
import { MORUNGS_MODULE } from "../../knowledge/moduleConfigs";

export default function AdminNewMorungPage() {
  return <KnowledgeNewPage config={MORUNGS_MODULE} />;
}
