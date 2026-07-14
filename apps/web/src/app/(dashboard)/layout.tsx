import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { ComposerPanel } from "@/components/composer/composer-panel";
import { getSessionSummary } from "@/lib/server-api";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const summary = await getSessionSummary();

  return (
    <div className="flex min-h-screen">
      <Sidebar summary={summary} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar summary={summary} />
        <main className="flex-1 px-4 pt-14 pb-16 sm:px-6 sm:pt-0 md:px-8 md:pb-20">{children}</main>
      </div>
      <ComposerPanel />
    </div>
  );
}
