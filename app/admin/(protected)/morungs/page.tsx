import KnowledgeModulePage from "../knowledge/KnowledgeModulePage";
import { MORUNGS_MODULE } from "../knowledge/moduleConfigs";

export default function AdminMorungsPage() {
  return <KnowledgeModulePage config={MORUNGS_MODULE} />;
}
