import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

const TAB_TITLES: Record<string, string> = {
  analysis:     "Analytics",
  integrations: "Integrations",
  budget:       "Budget Allocation",
  scenarios:    "Scenario Simulator",
  settings:     "Settings",
};

const workspaceTabs = new Set(Object.keys(TAB_TITLES));
const workspaceRoutes: Record<string, string> = {
  analysis: "/dashboard/analytics",
  integrations: "/dashboard/integrations",
  budget: "/dashboard/budget",
  scenarios: "/dashboard/scenarios",
  settings: "/dashboard/settings",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}): Promise<Metadata> {
  const { tab } = await searchParams;
  const label = tab ? (TAB_TITLES[tab] ?? "Home") : "Home";
  return { title: label };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  if (tab && workspaceTabs.has(tab)) {
    redirect(workspaceRoutes[tab]);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Suspense>
          <DashboardHome />
        </Suspense>
      </div>
    </div>
  );
}
