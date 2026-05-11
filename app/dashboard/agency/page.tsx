import type { Metadata } from "next";
import { AgencyWorkspace } from "@/components/dashboard/AgencyWorkspace";

export const metadata: Metadata = {
  title: "Agency",
};

export default function DashboardAgencyPage() {
  return <AgencyWorkspace />;
}
