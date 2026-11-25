import KnowledgeEditPage from "../../knowledge/KnowledgeEditPage";
import { MORUNGS_MODULE } from "../../knowledge/moduleConfigs";

export default function AdminEditMorungPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <KnowledgeEditPage config={MORUNGS_MODULE} params={params} />;
}
