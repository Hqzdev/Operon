import { Suspense } from "react";
import type { Metadata } from "next";
import { Bot } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DigestCard } from "@/components/dashboard/DigestCard";
import { ThemeToggle } from "@/components/theme-toggle";

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
      className="h-svh min-h-svh overflow-hidden"
      style={{
        "--sidebar-width": "192px",
        "--sidebar-width-icon": "3.5rem",
      } as React.CSSProperties}
    >
      <Suspense>
        <AppSidebar />
      </Suspense>
      <SidebarInset className="flex h-svh min-h-0 flex-col overflow-hidden bg-sidebar">
        <header className="relative z-20 flex h-12 shrink-0 items-center justify-between bg-sidebar px-5">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="-ml-1 text-muted-foreground" />
            <Suspense>
              <DigestCard />
            </Suspense>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent">
              <Bot className="size-3.5 text-muted-foreground" />
              Autopilot
              <span className="size-2 rounded-full bg-muted" />
            </button>
            <ThemeToggle />
          </div>
        </header>
        <div className="dashboard-workspace min-h-0 flex-1 overflow-hidden bg-sidebar px-2 pb-2">
          <div className="dashboard-workspace-surface h-full overflow-auto bg-white text-foreground dark:bg-[#141414]">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
