import { Suspense } from "react";
import { AnalysisWorkbench } from "@/components/mvp/analysis-workbench";

export default function DashboardPage() {
  return (
    <Suspense>
      <AnalysisWorkbench />
    </Suspense>
  );
}
