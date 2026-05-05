import { Suspense } from "react";
import { AnalysisWorkbench } from "@/components/mvp/analysis-workbench";
import { DigestCard } from "@/components/dashboard/DigestCard";

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Suspense>
        <DigestCard />
      </Suspense>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Suspense>
          <AnalysisWorkbench />
        </Suspense>
      </div>
    </div>
  );
}
