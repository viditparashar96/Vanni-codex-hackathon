import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { ComposerPanel } from "@/components/composer/composer-panel";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 pt-14 pb-16 sm:px-6 sm:pt-0 md:px-8 md:pb-20">{children}</main>
      </div>
      <ComposerPanel />
    </div>
  );
}
