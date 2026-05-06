import { Suspense } from "react";
import type { Metadata } from "next";
import { Bot } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
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
      <SidebarInset className="flex h-svh min-h-0 flex-col overflow-hidden bg-background">
        <header className="relative z-20 flex h-12 shrink-0 items-center justify-between border-b border-[#d0d0d0] bg-card px-5 shadow-[0_8px_24px_rgba(0,0,0,0.05)] dark:border-[#343434] dark:shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <button className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent">
              <Bot className="size-3.5 text-muted-foreground" />
              Autopilot
              <span className="size-2 rounded-full bg-muted" />
            </button>
            <ThemeToggle />
          </div>
        </header>
        <div className="dashboard-workspace min-h-0 flex-1 overflow-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
