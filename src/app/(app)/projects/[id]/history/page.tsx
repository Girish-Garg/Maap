import { HistoryView } from "@/components/project/history-view";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HistoryView projectId={id} />;
}
