"use client";

import { useEffect, useState } from "react";
import { Bot, Zap, RefreshCw, Bell, TrendingUp, Puzzle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getApiBaseUrl } from "@/lib/api-base-url";

const steps = [
  {
    icon: RefreshCw,
    title: "Daily sync",
    body: "Fetches fresh data from your ad accounts every 24 hours automatically.",
  },
  {
    icon: Zap,
    title: "Smart analysis",
    body: "Every product and ad set is scored. Scale / Stop / Watch decisions are made for you.",
  },
  {
    icon: Bell,
    title: "Weekly digest",
    body: "A summary lands in your inbox every Monday — only what changed, no noise.",
  },
  {
    icon: TrendingUp,
    title: "Instant alerts",
    body: "If ROAS drops below break-even, you get notified right away.",
  },
];

export function AutopilotPanel() {
  const [enabled, setEnabled] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const apiBaseUrl = getApiBaseUrl();

  async function refreshAutopilotState() {
    const token = localStorage.getItem("operon_token");
    if (!token) return;

    const res = await fetch(`${apiBaseUrl}/integrations`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    const connections = await res.json() as Array<{
      accountName?: string | null;
      provider: string;
      scopes?: string[];
      metadata?: { source?: string; autopilotEnabled?: boolean } | null;
    }>;
    const extensionConnection = connections.find((connection) =>
      connection.scopes?.includes("extension_read") || connection.metadata?.source === "extension"
    );
    if (!extensionConnection) {
      setConnectedAccount(null);
      setEnabled(false);
      return;
    }

    setConnectedAccount(`${extensionConnection.accountName || "Extension"} · ${extensionConnection.provider}`);
    setEnabled(Boolean(extensionConnection.metadata?.autopilotEnabled));
  }

  async function updateAutopilot(nextEnabled: boolean) {
    setEnabled(nextEnabled);
    const token = localStorage.getItem("operon_token");
    if (!token) return;

    await fetch(`${apiBaseUrl}/integrations/autopilot`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ autopilotEnabled: nextEnabled }),
    }).catch(() => undefined);
  }

  useEffect(() => {
    refreshAutopilotState();
    const interval = window.setInterval(refreshAutopilotState, 10000);
    return () => window.clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent">
          <Bot className="size-3.5 text-muted-foreground" />
          Autopilot
          <span className={cn("size-2 rounded-full transition-colors", enabled ? "bg-emerald-500" : "bg-muted")} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[300px] p-0 shadow-lg">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-foreground">
              <Bot className="size-3.5 text-background" />
            </div>
            <span className="text-[13px] font-semibold">Autopilot</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{enabled ? "On" : "Off"}</span>
            <Switch
              checked={enabled}
              onCheckedChange={updateAutopilot}
              aria-label="Toggle Autopilot"
            />
          </div>
        </div>

        {/* Status banner */}
        <div className={cn(
          "mx-3 mt-3 rounded-lg px-3 py-2.5 text-[12px] leading-relaxed transition-colors",
          enabled
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "bg-muted text-muted-foreground"
        )}>
          {enabled
            ? `Autopilot is running${connectedAccount ? ` for ${connectedAccount}` : ""}.`
            : "Enable Autopilot to start monitoring your campaigns automatically."}
        </div>

        {/* Steps */}
        <div className="p-3 space-y-1">
          {steps.map((step) => (
            <div
              key={step.title}
              className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent cursor-default"
            >
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-background transition-colors group-hover:border-foreground/20 group-hover:bg-card">
                <step.icon className="size-3 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-medium leading-snug text-foreground">{step.title}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{step.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Chrome Extension block */}
        <div className="group mx-3 mb-3 flex cursor-default items-start gap-3 rounded-lg border border-border bg-card px-3 py-3 transition-colors hover:bg-accent">
          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-background transition-colors group-hover:border-foreground/20 group-hover:bg-card">
            <Puzzle className="size-3 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-foreground">Chrome Extension</span>
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                Required
              </span>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {connectedAccount
                ? `Connected: ${connectedAccount}.`
                : "Install the extension to let Autopilot scrape Meta, TikTok, and Shopify directly from your browser."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            Requires at least one connected ad account in{" "}
            <span className="font-medium text-foreground">Integrations</span>.
          </p>
        </div>

      </PopoverContent>
    </Popover>
  );
}
