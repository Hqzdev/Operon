import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalysisWorkbench } from "@/components/mvp/analysis-workbench";

export const metadata: Metadata = {
  title: "Integrations",
};

export default function DashboardIntegrationsPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Suspense>
          <AnalysisWorkbench initialTab="integrations" />
        </Suspense>
      </div>
    </div>
  );
}
