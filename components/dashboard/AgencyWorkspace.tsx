"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3 } from "lucide-react";

import { getApiBaseUrl } from "@/lib/api-base-url";

type AgencyOverview = {
  workspace: { id: string; name: string; logoUrl: string | null };
  role: "owner" | "member" | "view_only";
  clientCount: number;
  killsThisWeek: number;
  clients: Array<{ id: string; name: string; contactEmail: string | null; storeUrl: string | null }>;
  killItems: Array<{ id: string; clientName: string; reason: string; createdAt: string }>;
  reports: Array<{ id: string; clientId: string; filename: string; generatedAt: string }>;
};

function fmt(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function AgencyWorkspace() {
  const router = useRouter();
  const apiBaseUrl = getApiBaseUrl();
  const [agency, setAgency] = useState<AgencyOverview | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAgency() {
      const token = localStorage.getItem("operon_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`${apiBaseUrl}/agency`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (response.ok && isMounted) {
        setAgency(await response.json() as AgencyOverview);
      }
    }

    void loadAgency();
    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, router]);

  async function downloadAgencyReport(reportId: string, filename: string) {
    const token = localStorage.getItem("operon_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const response = await fetch(`${apiBaseUrl}/agency/reports/${reportId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="h-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <section>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-muted-foreground" />
            <h1 className="text-[24px] font-semibold leading-tight tracking-normal">Agency portfolio</h1>
          </div>
          <p className="mt-2 max-w-[640px] text-[13px] leading-5 text-muted-foreground">
            Manage client performance, portfolio-wide KILL calls, and white-label weekly PDFs.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold text-foreground">{agency?.workspace.name ?? "Workspace"}</div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Client operations and reporting.
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              {agency?.role ?? "owner"}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-[12px] text-muted-foreground">Clients</div>
              <div className="mt-1 text-[26px] font-semibold leading-none">{fmt(agency?.clientCount ?? 0)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Connected client accounts</div>
            </div>
            <div>
              <div className="text-[12px] text-muted-foreground">KILLs this week</div>
              <div className="mt-1 text-[26px] font-semibold leading-none">{fmt(agency?.killsThisWeek ?? 0)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Across the portfolio</div>
            </div>
            <div>
              <div className="text-[12px] text-muted-foreground">Weekly PDFs</div>
              <div className="mt-1 text-[26px] font-semibold leading-none">{fmt(agency?.reports.length ?? 0)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Generated automatically</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-[14px] font-semibold text-foreground">Recent portfolio calls</h2>
            <div className="mt-4 space-y-2">
              {(agency?.killItems ?? []).slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px]">
                  <div className="font-medium text-foreground">{item.clientName}</div>
                  <div className="mt-1 line-clamp-2 text-muted-foreground">{item.reason}</div>
                </div>
              ))}
              {!agency?.killItems?.length ? (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
                  No portfolio KILL calls this week.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-[14px] font-semibold text-foreground">White-label reports</h2>
            <div className="mt-4 space-y-2">
              {(agency?.reports ?? []).slice(0, 8).map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => void downloadAgencyReport(report.id, report.filename)}
                  className="block w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-[12px] transition-colors hover:bg-accent"
                >
                  <div className="font-medium text-foreground">{report.filename}</div>
                  <div className="mt-1 text-muted-foreground">Download client report</div>
                </button>
              ))}
              {!agency?.reports?.length ? (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
                  First weekly PDFs will appear after Monday's automatic report run.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
