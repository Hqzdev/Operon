"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellOff, Clock3, History, X } from "lucide-react";

import { getApiBaseUrl } from "@/lib/api-base-url";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type FatigueSeverity = "warning" | "critical";
type FatigueStatus = "active" | "dismissed" | "snoozed";

type TriggeredMetric = {
  signal: string;
  label: string;
  value: number;
  previousValue?: number;
  changePct?: number;
  windowDays?: number;
  fatigueStartedAt?: string;
  budgetChangePct?: number;
  rotationStrategies?: string[];
};

type FatigueAlert = {
  id: string;
  creativeName: string;
  severity: FatigueSeverity;
  status: FatigueStatus;
  triggeredMetrics: TriggeredMetric[];
  recommendation: string;
  detectedAt: string;
  dismissedAt?: string | null;
  snoozeUntil?: string | null;
};

function severityLabel(severity: FatigueSeverity) {
  return severity === "critical" ? "Critical" : "Warning";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function isTriggeredMetric(value: unknown): value is TriggeredMetric {
  return Boolean(value && typeof value === "object" && "label" in value);
}

export function CreativeFatigueAlerts() {
  const apiBaseUrl = getApiBaseUrl();
  const [alerts, setAlerts] = useState<FatigueAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function loadAlerts() {
    const token = localStorage.getItem("operon_token");
    if (!token) return;

    const response = await fetch(`${apiBaseUrl}/fatigue-alerts?includeHistory=true`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;

    const data = await response.json() as { alerts?: FatigueAlert[] };
    setAlerts((data.alerts ?? []).map((alert) => ({
      ...alert,
      triggeredMetrics: Array.isArray(alert.triggeredMetrics)
        ? alert.triggeredMetrics.filter(isTriggeredMetric)
        : [],
    })));
  }

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        await loadAlerts();
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  async function updateAlert(alertId: string, action: "dismiss" | "snooze") {
    const token = localStorage.getItem("operon_token");
    if (!token) return;

    setWorkingId(alertId);
    try {
      await fetch(`${apiBaseUrl}/fatigue-alerts/${alertId}/${action}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: action === "snooze" ? JSON.stringify({ days: 3 }) : undefined,
      });
      await loadAlerts();
    } finally {
      setWorkingId(null);
    }
  }

  const activeAlerts = useMemo(
    () => alerts.filter((alert) => alert.status === "active").slice(0, 3),
    [alerts],
  );

  const history = useMemo(
    () => alerts.slice(0, 5),
    [alerts],
  );

  if (loading) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-20 animate-pulse rounded-lg bg-muted" />
      </section>
    );
  }

  if (!activeAlerts.length && !history.length) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-600" />
        <h2 className="text-[14px] font-semibold text-foreground">Creative fatigue alerts</h2>
      </div>

      <div className="grid gap-3">
        {activeAlerts.map((alert) => (
          (() => {
            const ctrMetric = alert.triggeredMetrics.find((metric) => metric.signal === "ctr_decay");
            return (
          <div
            key={alert.id}
            className={cn(
              "rounded-lg border p-4",
              alert.severity === "critical"
                ? "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100"
                : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-semibold">Creative fatigue likely detected</p>
                  <span className="rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-medium">
                    {severityLabel(alert.severity)}
                  </span>
                </div>
                <p className="mt-1 truncate text-[13px] opacity-90">Ad: &quot;{alert.creativeName}&quot;</p>
                {ctrMetric?.fatigueStartedAt ? (
                  <p className="mt-1 text-[12px] opacity-80">
                    Fatigue started {formatShortDate(ctrMetric.fatigueStartedAt)}
                    {typeof ctrMetric.budgetChangePct === "number" ? ` · budget change ${ctrMetric.budgetChangePct > 0 ? "+" : ""}${ctrMetric.budgetChangePct}%` : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-md px-2 text-[12px]"
                  disabled={workingId === alert.id}
                  onClick={() => updateAlert(alert.id, "snooze")}
                >
                  <Clock3 className="mr-1 size-3.5" />
                  Snooze
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-md px-2 text-[12px]"
                  disabled={workingId === alert.id}
                  onClick={() => updateAlert(alert.id, "dismiss")}
                >
                  <X className="mr-1 size-3.5" />
                  Dismiss
                </Button>
              </div>
            </div>

            <div className="mt-3 grid gap-1.5 text-[13px] leading-5">
              {alert.triggeredMetrics.map((metric) => (
                <p key={`${alert.id}-${metric.signal}`}>{metric.label}</p>
              ))}
              <p className="font-medium">Recommendation: {alert.recommendation}</p>
              {ctrMetric?.rotationStrategies?.length ? (
                <div className="mt-2 rounded-md border border-current/15 bg-white/35 px-3 py-2 dark:bg-black/10">
                  <p className="text-[12px] font-semibold">Creative rotation ideas</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-[12px]">
                    {ctrMetric.rotationStrategies.map((strategy) => (
                      <li key={strategy}>{strategy}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
            );
          })()
        ))}
      </div>

      {history.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <History className="size-4" />
            Alert history per creative
          </div>
          <div className="grid gap-2">
            {history.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2 text-[12px]">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{alert.creativeName}</p>
                  <p className="truncate text-muted-foreground">
                    {alert.triggeredMetrics[0]?.label ?? "Fatigue signal"} · {formatDate(alert.detectedAt)}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                  <BellOff className="size-3" />
                  {alert.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
