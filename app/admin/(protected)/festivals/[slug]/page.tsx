import KnowledgeEditPage from "../../knowledge/KnowledgeEditPage";
import { FESTIVALS_MODULE } from "../../knowledge/moduleConfigs";

export default function AdminEditFestivalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <KnowledgeEditPage config={FESTIVALS_MODULE} params={params} />;
}
