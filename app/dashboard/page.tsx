import { Suspense } from "react";
import { AnalysisWorkbench } from "@/components/mvp/analysis-workbench";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

const workspaceTabs = new Set(["analysis", "integrations", "budget", "scenarios", "settings"]);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const showWorkspace = tab ? workspaceTabs.has(tab) : false;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Suspense>
          {showWorkspace ? <AnalysisWorkbench /> : <DashboardHome />}
        </Suspense>
      </div>
    </div>
  );
}
