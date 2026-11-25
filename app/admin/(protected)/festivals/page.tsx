import KnowledgeModulePage from "../knowledge/KnowledgeModulePage";
import { FESTIVALS_MODULE } from "../knowledge/moduleConfigs";

export default function AdminFestivalsPage() {
  return <KnowledgeModulePage config={FESTIVALS_MODULE} />;
}
