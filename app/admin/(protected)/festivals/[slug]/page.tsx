import KnowledgeEditPage from "../../knowledge/KnowledgeEditPage";
import { FESTIVALS_MODULE } from "../../knowledge/moduleConfigs";

/** Dynamic slug is request-time; allow blocking for Cache Components validation. */
export const instant = false;

export default function AdminEditFestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <KnowledgeEditPage config={FESTIVALS_MODULE} params={params} />;
}
