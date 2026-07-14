import { api } from "@/lib/api";
import { HistoryView } from "@/components/calls/history-view";

export default async function HistoryPage() {
  const calls = await api.getCalls();
  return <HistoryView calls={calls} />;
}
