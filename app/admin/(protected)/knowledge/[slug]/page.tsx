import KnowledgeEditPage from "../KnowledgeEditPage";
import { KNOWLEDGE_MODULE } from "../moduleConfigs";

/** Dynamic slug is request-time; allow blocking for Cache Components validation. */
export const instant = false;

export default function AdminEditKnowledgePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <KnowledgeEditPage config={KNOWLEDGE_MODULE} params={params} />;
}
