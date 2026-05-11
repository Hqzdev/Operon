import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalysisWorkbench } from "@/components/mvp/analysis-workbench";

export const metadata: Metadata = {
  title: "Budget Allocation",
};

export default function DashboardBudgetPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Suspense>
          <AnalysisWorkbench initialTab="budget" />
        </Suspense>
      </div>
    </div>
  );
}
