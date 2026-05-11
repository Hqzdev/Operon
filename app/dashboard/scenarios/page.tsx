import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalysisWorkbench } from "@/components/mvp/analysis-workbench";

export const metadata: Metadata = {
  title: "Scenario Simulator",
};

export default function DashboardScenariosPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Suspense>
          <AnalysisWorkbench initialTab="scenario" />
        </Suspense>
      </div>
    </div>
  );
}
