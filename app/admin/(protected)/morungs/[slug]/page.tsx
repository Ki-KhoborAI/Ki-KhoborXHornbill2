import KnowledgeEditPage from "../../knowledge/KnowledgeEditPage";
import { MORUNGS_MODULE } from "../../knowledge/moduleConfigs";

/** Dynamic slug is request-time; allow blocking for Cache Components validation. */
export const instant = false;

export default function AdminEditMorungPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <KnowledgeEditPage config={MORUNGS_MODULE} params={params} />;
}
