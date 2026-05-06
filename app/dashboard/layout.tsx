import { Suspense } from "react";
import type { Metadata } from "next";
import { Bell, Bot } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";

export const metadata: Metadata = {
  title: "Home | Operon",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      className="h-svh min-h-svh overflow-hidden bg-white"
      style={{
        "--sidebar-width": "192px",
        "--sidebar-width-icon": "3.5rem",
      } as React.CSSProperties}
    >
      <Suspense>
        <AppSidebar />
      </Suspense>
      <SidebarInset className="flex h-svh min-h-0 flex-col overflow-hidden bg-[#F7F8FA]">
        <header className="relative z-20 flex h-12 shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-5">
          <SidebarTrigger className="-ml-1 text-[#9CA3AF]" />
          <div className="flex items-center gap-2">
            <button className="flex h-8 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#374151] transition-colors hover:bg-[#F9FAFB]">
              <Bot className="size-3.5 text-[#6B7280]" />
              Autopilot
              <span className="size-2 rounded-full bg-[#D1D5DB]" />
            </button>
            <button className="flex size-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F3F4F6]">
              <Bell className="size-[18px]" />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
