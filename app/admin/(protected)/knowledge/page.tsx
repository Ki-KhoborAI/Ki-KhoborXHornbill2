import KnowledgeModulePage from "./KnowledgeModulePage";
import { KNOWLEDGE_MODULE } from "./moduleConfigs";

export default function AdminKnowledgePage() {
  return <KnowledgeModulePage config={KNOWLEDGE_MODULE} />;
}
