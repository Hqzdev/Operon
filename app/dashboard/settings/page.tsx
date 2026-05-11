import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalysisWorkbench } from "@/components/mvp/analysis-workbench";

export const metadata: Metadata = {
  title: "Settings",
};

export default function DashboardSettingsPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Suspense>
          <AnalysisWorkbench initialTab="settings" />
        </Suspense>
      </div>
    </div>
  );
}
