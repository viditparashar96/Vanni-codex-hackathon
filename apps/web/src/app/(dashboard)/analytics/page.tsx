import { api } from "@/lib/api";
import { AnalyticsView } from "@/components/analytics/analytics-view";

export default async function AnalyticsPage() {
  const analytics = await api.getAnalytics();
  return <AnalyticsView data={analytics} />;
}
