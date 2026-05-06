import { Suspense } from "react";
import type { Metadata } from "next";
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
    <SidebarProvider className="h-svh min-h-svh overflow-hidden bg-background">
      <Suspense>
        <AppSidebar />
      </Suspense>
      <SidebarInset className="relative h-svh min-h-0 overflow-hidden">
        <header className="relative z-20 flex h-10 shrink-0 items-center gap-2 border-b bg-background/95 px-3">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute left-0 right-0 top-0 h-px bg-border/70" />
            <div className="absolute bottom-0 right-0 h-px w-[min(72rem,76vw)] bg-border/70" />
            <div className="absolute bottom-0 right-0 h-[min(30rem,52vh)] w-px bg-border/70" />
          </div>
          <div className="relative z-0 h-full overflow-hidden">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
