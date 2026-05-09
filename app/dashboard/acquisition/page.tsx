import type { Metadata } from "next";
import { RedditLeadsAdmin } from "@/components/dashboard/RedditLeadsAdmin";

export const metadata: Metadata = {
  title: "Acquisition Leads",
};

export default function AcquisitionPage() {
  return <RedditLeadsAdmin />;
}
