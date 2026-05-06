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
      className="h-svh min-h-svh overflow-hidden bg-[#f3f3f3] text-[#171717]"
      style={{
        "--sidebar-width": "22rem",
        "--sidebar-width-icon": "4rem",
      } as React.CSSProperties}
    >
      <Suspense>
        <AppSidebar />
      </Suspense>
      <SidebarInset className="relative h-svh min-h-0 overflow-hidden bg-[#f7f7f7]">
        <header className="relative z-20 flex h-[108px] shrink-0 items-center justify-between bg-[#f3f3f3] px-8">
          <SidebarTrigger className="-ml-1 text-[#171717]" />
          <div className="flex items-center gap-6">
            <button className="flex h-14 items-center gap-3 rounded-xl border border-[#dddddd] bg-[#f5f5f5] px-6 text-[19px] font-medium text-[#555555]">
              <Bot className="size-5" />
              Autopilot
              <span className="size-2.5 rounded-full bg-[#c9c9c9]" />
            </button>
            <button className="flex size-10 items-center justify-center text-[#171717]">
              <Bell className="size-7" />
            </button>
          </div>
        </header>
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-tl-2xl bg-white shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
          <div className="relative z-0 h-full overflow-hidden">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
