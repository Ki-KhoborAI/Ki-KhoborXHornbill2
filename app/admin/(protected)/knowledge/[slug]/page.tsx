import KnowledgeEditPage from "../KnowledgeEditPage";
import { KNOWLEDGE_MODULE } from "../moduleConfigs";

export default function AdminEditKnowledgePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <KnowledgeEditPage config={KNOWLEDGE_MODULE} params={params} />;
}
