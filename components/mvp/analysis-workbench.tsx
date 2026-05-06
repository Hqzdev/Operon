"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Cable,
  Crown,
  KeyRound,
  LoaderCircle,
  LogOut,
  Minus,
  Moon,
  Plus,
  Store,
  Sun,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  type AnalysisHistoryItem,
  type AnalysisInput,
  type AnalysisOutput,
} from "@/lib/analysis-schema";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";

const initialForm: AnalysisInput = {
  product_name: "Lumbar Support Cushion",
  product_description:
    "Orthopedic seat cushion for office workers with lower back pain. Memory foam, fits any chair. Reduces discomfort after 1–2 hours of sitting.",
  product_price: 34.99,
  cost: 8.50,
  ctr: 1.8,
  cpc: 0.95,
  cpm: 72,
  impressions: 18400,
  clicks: 331,
  add_to_cart: 22,
  purchases: 4,
  revenue: 139.96,
  stage: "testing",
};

const fields: Array<{ key: keyof AnalysisInput; label: string; step?: string }> = [
  { key: "product_price", label: "Product price", step: "0.01" },
  { key: "cost", label: "Cost", step: "0.01" },
  { key: "ctr", label: "CTR %", step: "0.01" },
  { key: "cpc", label: "CPC", step: "0.01" },
  { key: "cpm", label: "CPM", step: "0.01" },
  { key: "impressions", label: "Impressions", step: "1" },
  { key: "clicks", label: "Clicks", step: "1" },
  { key: "add_to_cart", label: "Add to cart", step: "1" },
  { key: "purchases", label: "Purchases", step: "1" },
  { key: "revenue", label: "Revenue", step: "0.01" },
];

function badgeVariant(decision: string) {
  if (decision === "SCALE") return "default";
  if (decision === "KILL") return "destructive";
  return "secondary";
}

function recBadgeVariant(rec: string) {
  if (rec === "SCALE") return "default";
  if (rec === "CUT") return "destructive";
  return "secondary";
}

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  usageCount: number;
  usageResetAt: string;
};

type AdSetInput = {
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  add_to_cart: number;
  purchases: number;
  revenue: number;
  product_price: number;
  cost: number;
};

type BudgetAllocationResult = {
  totalBudget: number;
  adSets: Array<{
    name: string;
    spend: number;
    roas: number;
    cpa: number | null;
    breakEvenRoas: number;
    conversionRate: number;
    efficiencyScore: number;
    recommendation: "SCALE" | "HOLD" | "CUT";
    recommendedBudget: number;
    allocatedPct: number;
  }>;
  summary: string;
};

type ScenarioMetrics = {
  impressions: number;
  clicks: number;
  purchases: number;
  revenue: number;
  spend: number;
  roas: number;
  profit: number;
  cpa: number | null;
  conversionRate: number;
};

type ScenarioResult = {
  baseline: ScenarioMetrics;
  projected: ScenarioMetrics;
  delta: { revenue_pct: number; profit_pct: number | null; roas_pct: number; purchases_pct: number };
  insight: string;
};

type IntegrationConnection = {
  id: string;
  provider: "META" | "TIKTOK" | "SHOPIFY";
  externalAccountId: string;
  accountName: string | null;
  status: "CONNECTED" | "ACTION_REQUIRED" | "DISCONNECTED" | "ERROR";
  scopes: string[];
  lastSyncedAt: string | null;
  nextSyncAt: string;
  lastError: string | null;
  createdAt: string;
};

type IntegrationSnapshot = {
  id: string;
  provider: "META" | "TIKTOK" | "SHOPIFY";
  externalAccountId: string;
  externalEntityId: string;
  entityName: string | null;
  date: string;
  analysisInput: AnalysisInput;
  metrics: Record<string, unknown>;
};

const emptyAdSet = (): AdSetInput => ({
  name: "", spend: 0, impressions: 0, clicks: 0,
  add_to_cart: 0, purchases: 0, revenue: 0, product_price: 0, cost: 0,
});

const dashboardTabs = new Set(["analysis", "integrations", "budget", "scenario", "settings"]);

function numberInputValue(value: number) {
  return value === 0 ? "" : String(value);
}

function parseNumberInput(value: string, integer = false) {
  if (value.trim() === "") return 0;
  const parsed = integer ? Number.parseInt(value, 10) : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AnalysisWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkTheme = resolvedTheme === "dark";

  // Analysis state
  const [form, setForm] = useState<AnalysisInput>(initialForm);
  const [result, setResult] = useState<AnalysisOutput | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("analysis");

  // Settings state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [settingsName, setSettingsName] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Budget Allocation state
  const [budgetTotal, setBudgetTotal] = useState(1000);
  const [adSets, setAdSets] = useState<AdSetInput[]>([emptyAdSet(), emptyAdSet()]);
  const [budgetResult, setBudgetResult] = useState<BudgetAllocationResult | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  // Scenario Simulator state
  const [scenarioBase, setScenarioBase] = useState({
    product_price: 34.99, cost: 8.50, impressions: 18400, clicks: 331,
    add_to_cart: 22, purchases: 4, revenue: 139.96, ctr: 1.8, cpc: 0.95, cpm: 72,
  });
  const [scenarioCtrDelta, setScenarioCtrDelta] = useState(0);
  const [scenarioConvDelta, setScenarioConvDelta] = useState(0);
  const [scenarioCpcDelta, setScenarioCpcDelta] = useState(0);
  const [scenarioAovDelta, setScenarioAovDelta] = useState(0);
  const [scenarioNewBudget, setScenarioNewBudget] = useState<string>("");
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  // Integrations state
  const [integrations, setIntegrations] = useState<IntegrationConnection[]>([]);
  const [snapshots, setSnapshots] = useState<IntegrationSnapshot[]>([]);
  const [shopifyShop, setShopifyShop] = useState("");
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [integrationsMsg, setIntegrationsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const apiBaseUrl = getApiBaseUrl();

  function getToken() {
    return localStorage.getItem("operon_token");
  }

  function logout() {
    localStorage.removeItem("operon_token");
    localStorage.removeItem("operon_user");
    router.push("/login");
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      const token = getToken();
      if (!token) { router.push("/login"); return; }

      try {
        const paymentId = new URLSearchParams(window.location.search).get("paymentId");
        if (paymentId) {
          try {
            await fetch(`${apiBaseUrl}/payments/${paymentId}/sync`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch {
            // Profile loading below still lets webhook-based activation show up.
          }
          window.history.replaceState(null, "", window.location.pathname);
        }

        const [profileRes, historyRes, integrationsRes, metricsRes] = await Promise.all([
          fetch(`${apiBaseUrl}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/analysis`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/integrations`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/integrations/metrics`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!isMounted) return;

        if (profileRes.ok) {
          const profile = await profileRes.json() as UserProfile;
          setUser(profile);
          setSettingsName(profile.name ?? "");
        } else if (profileRes.status === 401) {
          logout();
          return;
        }

        if (historyRes.ok) {
          const data = await historyRes.json() as Array<{ id: string; createdAt: string; inputData: AnalysisInput; result: AnalysisOutput }>;
          setHistory(data.map((item) => ({ id: item.id, createdAt: item.createdAt, input: item.inputData, output: item.result })));
        }

        if (integrationsRes.ok) {
          setIntegrations(await integrationsRes.json() as IntegrationConnection[]);
        }

        if (metricsRes.ok) {
          const data = await metricsRes.json() as { snapshots: IntegrationSnapshot[]; latestInput: AnalysisInput | null };
          setSnapshots(data.snapshots);
          if (data.latestInput) {
            setForm(data.latestInput);
          }
        }
      } catch {
        if (isMounted) setHistory([]);
      }
    }

    loadInitial();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const nextTab = tabParam === "scenarios" ? "scenario" : (tabParam ?? "analysis");
    setActiveTab(dashboardTabs.has(nextTab) ? nextTab : "analysis");
  }, [searchParams]);

  async function saveProfile() {
    const token = getToken();
    if (!token) return;
    setSettingsSaving(true);
    setSettingsMsg(null);
    try {
      const res = await fetch(`${apiBaseUrl}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: settingsName }),
      });
      const data = await res.json() as UserProfile;
      if (!res.ok) { setSettingsMsg({ type: "err", text: (data as { message?: string }).message ?? "Failed to save" }); return; }
      setUser(data);
      setSettingsMsg({ type: "ok", text: "Saved" });
    } catch {
      setSettingsMsg({ type: "err", text: "Network error" });
    } finally {
      setSettingsSaving(false);
    }
  }

  async function changePassword() {
    if (pwNew !== pwConfirm) { setPwMsg({ type: "err", text: "Passwords don't match" }); return; }
    if (pwNew.length < 8) { setPwMsg({ type: "err", text: "Minimum 8 characters" }); return; }
    const token = getToken();
    if (!token) return;
    setPwSaving(true);
    setPwMsg(null);
    try {
      const res = await fetch(`${apiBaseUrl}/users/me/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        setPwMsg({ type: "err", text: data.message ?? "Failed" });
        return;
      }
      setPwMsg({ type: "ok", text: "Password changed" });
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
    } catch {
      setPwMsg({ type: "err", text: "Network error" });
    } finally {
      setPwSaving(false);
    }
  }

  async function submit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const token = getToken();
      if (!token) { router.push("/login"); return; }

      const response = await fetch(`${apiBaseUrl}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message ?? data.error ?? "Analysis failed");
        return;
      }

      const output = data.result as AnalysisOutput;
      setResult(output);

      // Auto-fill scenario base from last analysis input
      setScenarioBase({
        product_price: form.product_price, cost: form.cost,
        impressions: form.impressions, clicks: form.clicks,
        add_to_cart: form.add_to_cart, purchases: form.purchases,
        revenue: form.revenue, ctr: form.ctr, cpc: form.cpc, cpm: form.cpm,
      });

      // Refresh profile to get updated usageCount
      const profileRes = await fetch(`${apiBaseUrl}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (profileRes.ok) {
        const profile = await profileRes.json() as UserProfile;
        setUser(profile);
      }

      // Refresh history
      const historyResponse = await fetch(`${apiBaseUrl}/analysis`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (historyResponse.ok) {
        const historyData = await historyResponse.json() as Array<{ id: string; createdAt: string; inputData: AnalysisInput; result: AnalysisOutput }>;
        setHistory(historyData.map((item) => ({ id: item.id, createdAt: item.createdAt, input: item.inputData, output: item.result })));
      }
    } catch {
      setError("Unable to reach the analysis endpoint.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitBudget() {
    setBudgetError(null);
    setBudgetLoading(true);
    try {
      const token = getToken();
      if (!token) { router.push("/login"); return; }
      const res = await fetch(`${apiBaseUrl}/budget/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ totalBudget: budgetTotal, adSets }),
      });
      const data = await res.json();
      if (!res.ok) { setBudgetError(data.message ?? "Failed"); return; }
      setBudgetResult(data as BudgetAllocationResult);
    } catch {
      setBudgetError("Network error");
    } finally {
      setBudgetLoading(false);
    }
  }

  async function submitScenario() {
    setScenarioError(null);
    setScenarioLoading(true);
    try {
      const token = getToken();
      if (!token) { router.push("/login"); return; }
      const changes: Record<string, number> = {};
      if (scenarioCtrDelta !== 0) changes.ctr_delta_pct = scenarioCtrDelta;
      if (scenarioConvDelta !== 0) changes.conversion_delta_pct = scenarioConvDelta;
      if (scenarioCpcDelta !== 0) changes.cpc_delta_pct = scenarioCpcDelta;
      if (scenarioAovDelta !== 0) changes.aov_delta_pct = scenarioAovDelta;
      if (scenarioNewBudget) changes.new_budget = Number(scenarioNewBudget);
      const res = await fetch(`${apiBaseUrl}/scenario/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ base: scenarioBase, changes }),
      });
      const data = await res.json();
      if (!res.ok) { setScenarioError(data.message ?? "Failed"); return; }
      setScenarioResult(data as ScenarioResult);
    } catch {
      setScenarioError("Network error");
    } finally {
      setScenarioLoading(false);
    }
  }

  async function upgradePlan(plan: "PRO" | "SCALE") {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${apiBaseUrl}/payments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json() as { confirmationUrl?: string; message?: string };
    if (res.ok && data.confirmationUrl) {
      window.location.href = data.confirmationUrl;
    }
  }

  async function refreshIntegrations() {
    const token = getToken();
    if (!token) return;
    const [integrationsRes, metricsRes] = await Promise.all([
      fetch(`${apiBaseUrl}/integrations`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBaseUrl}/integrations/metrics`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (integrationsRes.ok) {
      setIntegrations(await integrationsRes.json() as IntegrationConnection[]);
    }
    if (metricsRes.ok) {
      const data = await metricsRes.json() as { snapshots: IntegrationSnapshot[]; latestInput: AnalysisInput | null };
      setSnapshots(data.snapshots);
    }
  }

  async function connectProvider(provider: IntegrationConnection["provider"]) {
    const token = getToken();
    if (!token) return;
    setIntegrationsLoading(true);
    setIntegrationsMsg(null);
    try {
      const res = await fetch(`${apiBaseUrl}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider, shop: provider === "SHOPIFY" ? shopifyShop : undefined }),
      });
      const data = await res.json() as { url?: string; message?: string };
      if (!res.ok || !data.url) {
        setIntegrationsMsg({ type: "err", text: data.message ?? "Connection failed" });
        return;
      }
      window.location.href = data.url;
    } catch {
      setIntegrationsMsg({ type: "err", text: "Network error" });
    } finally {
      setIntegrationsLoading(false);
    }
  }

  async function syncIntegrations() {
    const token = getToken();
    if (!token) return;
    setIntegrationsLoading(true);
    setIntegrationsMsg(null);
    try {
      const res = await fetch(`${apiBaseUrl}/integrations`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) {
        setIntegrationsMsg({ type: "err", text: data.message ?? "Sync failed" });
        return;
      }
      await refreshIntegrations();
      setIntegrationsMsg({ type: "ok", text: "Metrics synced" });
    } catch {
      setIntegrationsMsg({ type: "err", text: "Network error" });
    } finally {
      setIntegrationsLoading(false);
    }
  }

  async function disconnectIntegration(connectionId: string) {
    const token = getToken();
    if (!token) return;
    await fetch(`${apiBaseUrl}/integrations/${connectionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await refreshIntegrations();
  }

  function updateAdSet(index: number, field: keyof AdSetInput, value: string) {
    setAdSets((prev) => prev.map((s, i) => {
      if (i !== index) return s;
      return { ...s, [field]: field === "name" ? value : parseNumberInput(value) };
    }));
  }

  const hasProFeatures = true;

  return (
    <main className="relative h-full overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(20,20,20,0.08),transparent_25%),radial-gradient(circle_at_center_right,rgba(20,20,20,0.05),transparent_30%)]" />
      <div className="flex h-full min-h-0 flex-col px-4 py-4 sm:px-6 lg:px-8">
          <header className="mb-4 shrink-0">
            <div className="font-display text-2xl tracking-tight">Operon Analysis Workbench</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Decision engine, diagnosis, action plan, and product validation
            </div>
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-0 flex-1 overflow-hidden">
          {/* ── Integrations tab ── */}
          <TabsContent value="integrations" className="h-full overflow-hidden">
            <section className="grid h-full min-h-0 gap-6 overflow-hidden xl:grid-cols-[0.85fr_1.15fr] [&>[data-slot=card]]:h-full [&>[data-slot=card]]:min-h-0 [&>[data-slot=card]]:overflow-hidden [&_[data-slot=card-content]]:min-h-0 [&_[data-slot=card-content]]:overflow-hidden">
              <Card className="border-foreground/10 bg-card/70 py-0">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="font-display text-3xl">Connections</CardTitle>
                  <CardDescription>
                    Read-only OAuth for ad and store data.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  <div className="grid gap-3">
                    <Button
                      variant="outline"
                      className="h-11 justify-start rounded-xl"
                      disabled={integrationsLoading}
                      onClick={() => connectProvider("META")}
                    >
                      <Cable className="size-4" />
                      Connect Meta Ads
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 justify-start rounded-xl"
                      disabled={integrationsLoading}
                      onClick={() => connectProvider("TIKTOK")}
                    >
                      <Cable className="size-4" />
                      Connect TikTok Ads
                    </Button>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Input
                        placeholder="your-store.myshopify.com"
                        value={shopifyShop}
                        onChange={(event) => setShopifyShop(event.target.value)}
                        className="h-11 rounded-xl"
                      />
                      <Button
                        variant="outline"
                        className="h-11 rounded-xl"
                        disabled={integrationsLoading || !shopifyShop}
                        onClick={() => connectProvider("SHOPIFY")}
                      >
                        <Store className="size-4" />
                        Connect Shopify
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="flex flex-wrap gap-3">
                    <Button className="rounded-full" onClick={syncIntegrations} disabled={integrationsLoading}>
                      {integrationsLoading ? <LoaderCircle className="size-4 animate-spin" /> : <TrendingUp className="size-4" />}
                      Sync now
                    </Button>
                    <Button variant="outline" className="rounded-full" onClick={refreshIntegrations}>
                      Refresh
                    </Button>
                  </div>

                  {integrationsMsg ? (
                    <p className={`mt-4 text-sm ${integrationsMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                      {integrationsMsg.text}
                    </p>
                  ) : null}

                  <div className="mt-6 space-y-3">
                    {integrations.length ? integrations.map((connection) => (
                      <div key={connection.id} className="rounded-2xl border border-foreground/10 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{connection.accountName ?? connection.externalAccountId}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {connection.provider} · {connection.status}
                            </div>
                            {connection.lastSyncedAt ? (
                              <div className="mt-1 text-xs text-muted-foreground">
                                Last sync {new Date(connection.lastSyncedAt).toLocaleString()}
                              </div>
                            ) : null}
                            {connection.lastError ? (
                              <div className="mt-2 text-xs text-red-600">{connection.lastError}</div>
                            ) : null}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full text-red-600 hover:text-red-600"
                            onClick={() => disconnectIntegration(connection.id)}
                          >
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-foreground/10 p-6 text-sm text-muted-foreground">
                        No connected accounts yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-foreground/10 bg-card/70 py-0">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="font-display text-3xl">Synced metrics</CardTitle>
                  <CardDescription>
                    Pick a daily snapshot to auto-populate the analysis form.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  <div className="space-y-3">
                    {snapshots.length ? snapshots.map((snapshot) => (
                      <div key={snapshot.id} className="rounded-2xl border border-foreground/10 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{snapshot.entityName ?? snapshot.externalEntityId}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {snapshot.provider} · {new Date(snapshot.date).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="rounded-full"
                            onClick={() => {
                              setForm(snapshot.analysisInput);
                              setActiveTab("analysis");
                            }}
                          >
                            Use in form
                          </Button>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                          <div>
                            <div className="text-xs text-muted-foreground">Impressions</div>
                            <div className="tabular-nums">{snapshot.analysisInput.impressions}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Clicks</div>
                            <div className="tabular-nums">{snapshot.analysisInput.clicks}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">CTR</div>
                            <div className="tabular-nums">{snapshot.analysisInput.ctr}%</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Purchases</div>
                            <div className="tabular-nums">{snapshot.analysisInput.purchases}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Revenue</div>
                            <div className="tabular-nums">${snapshot.analysisInput.revenue}</div>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-foreground/10 text-center">
                        <div className="max-w-sm">
                          <div className="font-display text-3xl">No synced metrics</div>
                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                            Connect an account and run sync to populate daily snapshots.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          {/* ── Analysis tab ── */}
          <TabsContent value="analysis" className="h-full overflow-hidden">
            <section className="grid h-[60%] min-h-0 gap-6 overflow-hidden xl:grid-cols-[0.95fr_1.05fr] [&>[data-slot=card]]:h-full [&>[data-slot=card]]:min-h-0 [&>[data-slot=card]]:overflow-hidden [&_[data-slot=card-content]]:min-h-0 [&_[data-slot=card-content]]:overflow-hidden">
              <Card className="border-foreground/10 bg-card/70 py-0">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="font-display text-3xl">Input</CardTitle>
                  <CardDescription>
                    Enter the raw metrics for one product or ad setup.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="product_name">Product name</Label>
                      <Input
                        id="product_name"
                        value={form.product_name}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, product_name: event.target.value }))
                        }
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="product_description">Product description</Label>
                      <textarea
                        id="product_description"
                        value={form.product_description}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, product_description: event.target.value }))
                        }
                        className="border-input bg-background min-h-28 w-full rounded-xl border px-3 py-3 text-sm outline-none"
                      />
                    </div>
                    {fields.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={field.key}>{field.label}</Label>
                        <Input
                          id={field.key}
                          type="number"
                          step={field.step ?? "0.01"}
                          value={numberInputValue(form[field.key] as number)}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [field.key]:
                                field.step === "1"
                                  ? parseNumberInput(event.target.value, true)
                                  : parseNumberInput(event.target.value),
                            }))
                          }
                          className="h-11 rounded-xl"
                        />
                      </div>
                    ))}
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="stage">Stage</Label>
                      <select
                        id="stage"
                        value={form.stage}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            stage: event.target.value as AnalysisInput["stage"],
                          }))
                        }
                        className="border-input bg-background h-11 w-full rounded-xl border px-3 text-sm outline-none"
                      >
                        <option value="testing">testing</option>
                        <option value="scaling">scaling</option>
                        <option value="retesting">retesting</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button onClick={submit} disabled={isSubmitting} className="rounded-full">
                      {isSubmitting ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          Analyzing
                        </>
                      ) : (
                        <>
                          <Target className="size-4" />
                          Run analysis
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => { setForm(initialForm); setError(null); }}
                    >
                      Reset example
                    </Button>
                  </div>

                  {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
                </CardContent>
              </Card>

              <Card className="border-foreground/10 bg-card/70 py-0">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="font-display text-3xl">Output</CardTitle>
                  <CardDescription>
                    Strict operator output. Short, decisive, actionable.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  {result ? (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant={badgeVariant(result.decision.finalDecision) as "default" | "secondary" | "destructive"}>
                          {result.decision.finalDecision}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Confidence: {result.decision.confidence}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Provider: {result.provider}
                        </span>
                        {result.saved ? (
                          <span className="text-sm text-muted-foreground">Saved</span>
                        ) : null}
                      </div>

                      <div>
                        <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Why</div>
                        <p className="mt-2 text-base leading-relaxed">{result.decision.shortReason}</p>
                      </div>

                      <div>
                        <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Main problem</div>
                        <p className="mt-2 text-lg font-medium">{result.diagnosis.mainProblem}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{result.diagnosis.why}</p>
                        <p className="mt-2 text-sm">Evidence: <span className="text-muted-foreground">{result.diagnosis.proofMetric}</span></p>
                      </div>

                      <div>
                        <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Actions</div>
                        <ol className="mt-3 space-y-3">
                          {(Array.isArray(result.actionPlan) ? result.actionPlan : []).map((action, index) => (
                            <li key={action} className="flex gap-3">
                              <span className="font-mono text-sm text-muted-foreground">{index + 1}.</span>
                              <span className="text-sm leading-relaxed">{action}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-foreground/10 p-4">
                          <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Product validation</div>
                          <div className="mt-2 text-lg font-medium">{result.validation.verdict}</div>
                          <p className="mt-2 text-sm text-muted-foreground">{result.validation.reason}</p>
                        </div>
                        <div className="rounded-2xl border border-foreground/10 p-4">
                          <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Continue testing</div>
                          <div className="mt-2 text-lg font-medium">{result.validation.shouldContinueTesting ? "Yes" : "No"}</div>
                          <div className="mt-3 text-sm text-muted-foreground">Break-even ROAS: {result.derived.breakEvenRoas}</div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-foreground/10 p-4">
                          <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Profitability check</div>
                          <div className="mt-2 text-lg font-medium">{result.profitability.isProfitable ? "Profitable" : "Not profitable yet"}</div>
                          <p className="mt-2 text-sm text-muted-foreground">{result.profitability.why}</p>
                          <div className="mt-3 text-sm text-muted-foreground">Break-even CPA: ${result.profitability.breakEvenCpa}</div>
                        </div>
                        <div className="rounded-2xl border border-foreground/10 p-4">
                          <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Continue or stop</div>
                          <div className="mt-2 text-lg font-medium">{result.continueDecision.decision}</div>
                          <p className="mt-2 text-sm text-muted-foreground">{result.continueDecision.reason}</p>
                          <div className="mt-3 text-sm text-muted-foreground">Next minimum test: {result.continueDecision.minimumAdditionalTestNeeded}</div>
                        </div>
                      </div>

                      {result.ltvAdjustment?.hasEnoughHistory ? (
                        <div className="rounded-2xl border border-foreground/10 p-4">
                          <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground mb-3">LTV adjustment · Shopify data</div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                              <div className="text-xs text-muted-foreground">First-order break-even ROAS</div>
                              <div className="mt-1 font-mono">{result.ltvAdjustment.firstOrderBreakEvenRoas}x</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">LTV-adjusted break-even ROAS</div>
                              <div className="mt-1 font-mono text-green-600">{result.ltvAdjustment.ltvBreakEvenRoas}x</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">First-order break-even CPA</div>
                              <div className="mt-1 font-mono">${result.ltvAdjustment.firstOrderBreakEvenCpa}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">LTV-adjusted break-even CPA</div>
                              <div className="mt-1 font-mono text-green-600">${result.ltvAdjustment.ltvBreakEvenCpa}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Customer LTV</div>
                              <div className="mt-1 font-mono">${result.ltvAdjustment.ltv}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Repeat purchase rate</div>
                              <div className="mt-1 font-mono">{(result.ltvAdjustment.repeatPurchaseRate * 100).toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-muted-foreground">
                            Based on {result.ltvAdjustment.ordersAnalyzed} orders from {result.ltvAdjustment.customersAnalyzed} customers (90-day window).
                          </div>
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-foreground/10 p-4">
                        <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Funnel leak</div>
                        <div className="mt-2 text-lg font-medium">{result.funnelLeak.weakestStage}</div>
                        <p className="mt-2 text-sm text-muted-foreground">{result.funnelLeak.explanation}</p>
                        <div className="mt-3 text-sm text-muted-foreground">Severity: {result.funnelLeak.severity}</div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs font-mono uppercase tracking-wide text-muted-foreground">
                          <span>Decision confidence</span>
                          <span>
                            {result.decision.confidence === "high" ? "85" : result.decision.confidence === "medium" ? "65" : "35"}%
                          </span>
                        </div>
                        <Progress
                          value={result.decision.confidence === "high" ? 85 : result.decision.confidence === "medium" ? 65 : 35}
                        />
                      </div>

                      <div>
                        <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Creative angles</div>
                        <div className="mt-3 grid gap-4">
                          {result.creativeAngles.map((angle, index) => (
                            <div key={`${angle.hookIdea}-${index}`} className="rounded-2xl border border-foreground/10 p-4">
                              <div className="text-sm font-medium">Angle {index + 1}</div>
                              <div className="mt-3 text-sm"><span className="font-medium">Hook:</span> {angle.hookIdea}</div>
                              <div className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Concept:</span> {angle.concept}</div>
                              <div className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Emotion:</span> {angle.targetEmotion}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-dashed border-foreground/10 text-center">
                      <div className="max-w-sm">
                        <div className="font-display text-3xl">Run the first analysis</div>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          The dashboard will return a decision, diagnosis, profitability check,
                          funnel leak, creative ideas, and the next actions from one input.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="mt-6 grid h-[calc(40%-1.5rem)] min-h-0 gap-6 overflow-hidden xl:grid-cols-[0.95fr_1.05fr] [&>[data-slot=card]]:h-full [&>[data-slot=card]]:min-h-0 [&>[data-slot=card]]:overflow-hidden [&_[data-slot=card-content]]:min-h-0 [&_[data-slot=card-content]]:overflow-hidden">
              <Card className="border-foreground/10 bg-card/70 py-0">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="font-display text-3xl">Derived metrics</CardTitle>
                  <CardDescription>Calculated from the submitted dataset.</CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  {result ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        ["Spend", `$${result.derived.spend}`],
                        ["ROAS", String(result.derived.roas)],
                        ["Conversion rate", `${result.derived.conversionRate}%`],
                        ["Add-to-cart rate", `${result.derived.addToCartRate}%`],
                        ["Break-even ROAS", String(result.derived.breakEvenRoas)],
                        ["Break-even CPA", `$${result.derived.breakEvenCpa}`],
                        ["Current CPA", result.derived.currentCpa !== null ? `$${result.derived.currentCpa}` : "—"],
                        ["Max CPC", result.derived.maxCpcAtCurrentConversion !== null ? `$${result.derived.maxCpcAtCurrentConversion}` : "—"],
                        ["Profit", `$${result.derived.profit}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-foreground/10 p-4">
                          <div className="text-sm text-muted-foreground">{label}</div>
                          <div className="mt-2 font-display text-3xl">{value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Derived metrics will appear after the first analysis.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-foreground/10 bg-card/70 py-0">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="font-display text-3xl">Recent analyses</CardTitle>
                  <CardDescription>Loaded from PostgreSQL when DATABASE_URL is configured.</CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6">
                  {history.length ? (
                    <div className="space-y-4">
                      {history.map((item, index) => (
                        <div key={item.id}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="font-medium">
                                ${item.input.product_price} product at {item.createdAt.slice(0, 10)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {item.output.decision?.finalDecision} · {item.output.diagnosis?.mainProblem} · {item.output.continueDecision?.decision}
                              </div>
                            </div>
                            <Badge variant={badgeVariant(item.output.decision?.finalDecision ?? "") as "default" | "secondary" | "destructive"}>
                              {item.output.decision?.finalDecision}
                            </Badge>
                          </div>
                          {index < history.length - 1 ? <Separator className="mt-4" /> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No saved analyses yet. Configure PostgreSQL and run the form once.
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          {/* ── Budget Allocation tab ── */}
          <TabsContent value="budget" className="h-full overflow-hidden">
            {!hasProFeatures ? (
              <div className="flex min-h-[480px] items-center justify-center rounded-3xl border border-dashed border-foreground/10">
                <div className="max-w-sm text-center">
                  <Crown className="mx-auto size-10 text-amber-500 mb-4" />
                  <div className="font-display text-3xl">Pro plan required</div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Budget Allocation Engine compares your ad sets and recommends how to distribute your budget for maximum ROAS.
                  </p>
                  <Button className="mt-6 rounded-full gap-2" onClick={() => upgradePlan("SCALE")}>
                    <TrendingUp className="size-4" />
                    Upgrade to Pro · $19/mo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid h-full min-h-0 gap-6 overflow-hidden xl:grid-cols-[1fr_1fr] [&>[data-slot=card]]:h-full [&>[data-slot=card]]:min-h-0 [&>[data-slot=card]]:overflow-hidden [&_[data-slot=card-content]]:min-h-0 [&_[data-slot=card-content]]:overflow-hidden">
                <Card className="border-foreground/10 bg-card/70 py-0">
                  <CardHeader className="border-b border-foreground/10 py-6">
                    <CardTitle className="font-display text-3xl">Budget Allocation</CardTitle>
                    <CardDescription>
                      Compare ad sets and distribute your budget by efficiency.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 py-6 space-y-6">
                    <div className="space-y-2">
                      <Label>Total budget ($)</Label>
                      <Input
                        type="number"
                        step="10"
                        value={numberInputValue(budgetTotal)}
                        onChange={(e) => setBudgetTotal(parseNumberInput(e.target.value))}
                        className="h-11 rounded-xl"
                      />
                    </div>

                    <div className="space-y-4">
                      {adSets.map((set, idx) => (
                        <div key={idx} className="rounded-2xl border border-foreground/10 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Ad Set {idx + 1}</span>
                            {adSets.length > 2 && (
                              <button
                                onClick={() => setAdSets((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-muted-foreground hover:text-red-600 transition"
                              >
                                <Minus className="size-4" />
                              </button>
                            )}
                          </div>
                          <Input
                            placeholder="Name (e.g. US Broad)"
                            value={set.name}
                            onChange={(e) => updateAdSet(idx, "name", e.target.value)}
                            className="h-9 rounded-xl"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            {(["spend", "impressions", "clicks", "add_to_cart", "purchases", "revenue", "product_price", "cost"] as Array<keyof AdSetInput>).map((field) => (
                              field !== "name" && (
                                <div key={field} className="space-y-1">
                                  <Label className="text-xs capitalize">{field.replace(/_/g, " ")}</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={numberInputValue(set[field] as number)}
                                    onChange={(e) => updateAdSet(idx, field, e.target.value)}
                                    className="h-8 rounded-xl text-sm"
                                  />
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      ))}

                      {adSets.length < 10 && (
                        <button
                          onClick={() => setAdSets((prev) => [...prev, emptyAdSet()])}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-foreground/10 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition"
                        >
                          <Plus className="size-4" />
                          Add ad set
                        </button>
                      )}
                    </div>

                    <Button
                      className="w-full rounded-full"
                      onClick={submitBudget}
                      disabled={budgetLoading}
                    >
                      {budgetLoading ? <LoaderCircle className="size-4 animate-spin" /> : "Allocate budget"}
                    </Button>
                    {budgetError && <p className="text-sm text-red-600">{budgetError}</p>}
                  </CardContent>
                </Card>

                <Card className="border-foreground/10 bg-card/70 py-0">
                  <CardHeader className="border-b border-foreground/10 py-6">
                    <CardTitle className="font-display text-3xl">Allocation result</CardTitle>
                    <CardDescription>Recommended budget distribution by efficiency score.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 py-6">
                    {budgetResult ? (
                      <div className="space-y-5">
                        <p className="text-sm text-muted-foreground leading-relaxed">{budgetResult.summary}</p>
                        <div className="space-y-4">
                          {budgetResult.adSets.map((set) => (
                            <div key={set.name} className="rounded-2xl border border-foreground/10 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{set.name || "Unnamed"}</span>
                                <Badge variant={recBadgeVariant(set.recommendation) as "default" | "secondary" | "destructive"}>
                                  {set.recommendation}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <span className="text-muted-foreground">ROAS</span><span className="font-mono">{set.roas}x</span>
                                <span className="text-muted-foreground">CPA</span><span className="font-mono">{set.cpa !== null ? `$${set.cpa}` : "—"}</span>
                                <span className="text-muted-foreground">Break-even ROAS</span><span className="font-mono">{set.breakEvenRoas}x</span>
                                <span className="text-muted-foreground">Efficiency</span><span className="font-mono">{set.efficiencyScore}</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Recommended budget</span>
                                  <span className="font-medium">${set.recommendedBudget} ({set.allocatedPct}%)</span>
                                </div>
                                <Progress value={set.allocatedPct} className="h-1.5" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-foreground/10 text-center">
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Fill in your ad sets and click "Allocate budget" to see recommendations.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── Scenario Simulator tab ── */}
          <TabsContent value="scenario" className="h-full overflow-hidden">
            {!hasProFeatures ? (
              <div className="flex min-h-[480px] items-center justify-center rounded-3xl border border-dashed border-foreground/10">
                <div className="max-w-sm text-center">
                  <Crown className="mx-auto size-10 text-amber-500 mb-4" />
                  <div className="font-display text-3xl">Pro plan required</div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Scenario Simulator projects revenue and profit when you change CTR, conversion rate, CPC, or budget.
                  </p>
                  <Button className="mt-6 rounded-full gap-2" onClick={() => upgradePlan("SCALE")}>
                    <TrendingUp className="size-4" />
                    Upgrade to Pro · $19/mo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid h-full min-h-0 gap-6 overflow-hidden xl:grid-cols-[1fr_1fr] [&>[data-slot=card]]:h-full [&>[data-slot=card]]:min-h-0 [&>[data-slot=card]]:overflow-hidden [&_[data-slot=card-content]]:min-h-0 [&_[data-slot=card-content]]:overflow-hidden">
                <Card className="border-foreground/10 bg-card/70 py-0">
                  <CardHeader className="border-b border-foreground/10 py-6">
                    <CardTitle className="font-display text-3xl">Scenario Setup</CardTitle>
                    <CardDescription>
                      Set your baseline metrics and define hypothetical changes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 py-6 space-y-6">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Baseline metrics</p>
                      <div className="grid grid-cols-2 gap-3">
                        {(["product_price", "cost", "impressions", "clicks", "add_to_cart", "purchases", "revenue", "ctr", "cpc", "cpm"] as Array<keyof typeof scenarioBase>).map((field) => (
                          <div key={field} className="space-y-1">
                            <Label className="text-xs capitalize">{field.replace(/_/g, " ")}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={numberInputValue(scenarioBase[field])}
                              onChange={(e) => setScenarioBase((prev) => ({ ...prev, [field]: parseNumberInput(e.target.value) }))}
                              className="h-9 rounded-xl text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Hypothetical changes</p>
                      <div className="space-y-3">
                        {[
                          { label: "CTR change (%)", value: scenarioCtrDelta, setter: setScenarioCtrDelta },
                          { label: "Conversion rate change (%)", value: scenarioConvDelta, setter: setScenarioConvDelta },
                          { label: "CPC change (%)", value: scenarioCpcDelta, setter: setScenarioCpcDelta },
                          { label: "AOV change (%)", value: scenarioAovDelta, setter: setScenarioAovDelta },
                        ].map(({ label, value, setter }) => (
                          <div key={label} className="flex items-center gap-3">
                            <Label className="w-52 text-sm shrink-0">{label}</Label>
                            <Input
                              type="number"
                              step="1"
                              value={numberInputValue(value)}
                              onChange={(e) => setter(parseNumberInput(e.target.value))}
                              className="h-9 rounded-xl text-sm"
                            />
                          </div>
                        ))}
                        <div className="flex items-center gap-3">
                          <Label className="w-52 text-sm shrink-0">New budget ($) — optional</Label>
                          <Input
                            type="number"
                            step="10"
                            value={scenarioNewBudget}
                            onChange={(e) => setScenarioNewBudget(e.target.value)}
                            placeholder="Same as current"
                            className="h-9 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full rounded-full"
                      onClick={submitScenario}
                      disabled={scenarioLoading}
                    >
                      {scenarioLoading ? <LoaderCircle className="size-4 animate-spin" /> : "Run scenario"}
                    </Button>
                    {scenarioError && <p className="text-sm text-red-600">{scenarioError}</p>}
                  </CardContent>
                </Card>

                <Card className="border-foreground/10 bg-card/70 py-0">
                  <CardHeader className="border-b border-foreground/10 py-6">
                    <CardTitle className="font-display text-3xl">Projection</CardTitle>
                    <CardDescription>Baseline vs. projected outcome side by side.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 py-6">
                    {scenarioResult ? (
                      <div className="space-y-6">
                        <p className="text-sm leading-relaxed text-muted-foreground">{scenarioResult.insight}</p>

                        <div className="grid grid-cols-3 gap-2 text-xs font-mono uppercase tracking-wide text-muted-foreground pb-1 border-b border-foreground/10">
                          <span>Metric</span><span className="text-center">Baseline</span><span className="text-center">Projected</span>
                        </div>

                        {(
                          [
                            ["Impressions", scenarioResult.baseline.impressions, scenarioResult.projected.impressions, ""],
                            ["Clicks", scenarioResult.baseline.clicks, scenarioResult.projected.clicks, ""],
                            ["Purchases", scenarioResult.baseline.purchases, scenarioResult.projected.purchases, ""],
                            ["Revenue", scenarioResult.baseline.revenue, scenarioResult.projected.revenue, "$"],
                            ["Spend", scenarioResult.baseline.spend, scenarioResult.projected.spend, "$"],
                            ["ROAS", scenarioResult.baseline.roas, scenarioResult.projected.roas, "x"],
                            ["Profit", scenarioResult.baseline.profit, scenarioResult.projected.profit, "$"],
                            ["CPA", scenarioResult.baseline.cpa, scenarioResult.projected.cpa, "$"],
                          ] as Array<[string, number | null, number | null, string]>
                        ).map(([label, base, proj, prefix]) => {
                          const improved = proj !== null && base !== null && proj > base;
                          const worsened = proj !== null && base !== null && proj < base;
                          return (
                            <div key={label} className="grid grid-cols-3 gap-2 text-sm py-2 border-b border-foreground/5">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="text-center font-mono">
                                {base !== null ? `${prefix}${base}` : "—"}
                              </span>
                              <span className={`text-center font-mono font-medium ${improved ? "text-green-600" : worsened ? "text-red-600" : ""}`}>
                                {proj !== null ? `${prefix}${proj}` : "—"}
                              </span>
                            </div>
                          );
                        })}

                        <div className="rounded-2xl border border-foreground/10 p-4 grid grid-cols-2 gap-3">
                          {[
                            ["Revenue Δ", scenarioResult.delta.revenue_pct, "%"],
                            ["Purchases Δ", scenarioResult.delta.purchases_pct, "%"],
                            ["ROAS Δ", scenarioResult.delta.roas_pct, "%"],
                            ["Profit Δ", scenarioResult.delta.profit_pct, "%"],
                          ].map(([label, val, suffix]) => (
                            <div key={label as string}>
                              <div className="text-xs text-muted-foreground">{label}</div>
                              <div className={`text-xl font-display font-medium mt-1 ${Number(val) > 0 ? "text-green-600" : Number(val) < 0 ? "text-red-600" : ""}`}>
                                {val !== null ? `${Number(val) > 0 ? "+" : ""}${val}${suffix}` : "—"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-foreground/10 text-center">
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Set your baseline, define the changes, and click "Run scenario" to see projections.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          <TabsContent value="settings" className="h-full overflow-hidden">
            <section className="grid h-full min-h-0 gap-6 overflow-hidden xl:grid-cols-[0.8fr_1.2fr] [&>[data-slot=card]]:h-full [&>[data-slot=card]]:min-h-0 [&>[data-slot=card]]:overflow-hidden [&_[data-slot=card-content]]:min-h-0 [&_[data-slot=card-content]]:overflow-hidden">
              <Card className="border-foreground/10 bg-card/70 py-0">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="font-display text-3xl">Settings</CardTitle>
                  <CardDescription>Profile, appearance, and account controls.</CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6 space-y-5">
                  <div className="rounded-2xl border border-foreground/10 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      {isDarkTheme ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                      Appearance
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium">Dark theme</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Switch the workspace between light and black mode.
                        </p>
                      </div>
                      <Switch
                        checked={isDarkTheme}
                        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                        aria-label="Toggle dark theme"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-foreground/10 p-5 space-y-4">
                    <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Profile
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <div className="flex h-10 w-full items-center rounded-xl border border-foreground/10 bg-muted/40 px-3 text-sm">
                        {user?.email ?? "—"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="settings-page-name" className="text-sm">Name</Label>
                      <Input
                        id="settings-page-name"
                        value={settingsName}
                        onChange={(e) => setSettingsName(e.target.value)}
                        className="h-10 rounded-xl"
                      />
                    </div>
                    {settingsMsg && (
                      <p className={`text-xs ${settingsMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                        {settingsMsg.text}
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="h-9 rounded-full"
                      onClick={saveProfile}
                      disabled={settingsSaving}
                    >
                      {settingsSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : "Save changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-foreground/10 bg-card/70 py-0">
                <CardHeader className="border-b border-foreground/10 py-6">
                  <CardTitle className="font-display text-3xl">Account</CardTitle>
                  <CardDescription>Password and session actions.</CardDescription>
                </CardHeader>
                <CardContent className="px-6 py-6 space-y-5">
                  <div className="rounded-2xl border border-foreground/10 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      <KeyRound className="size-3.5" />
                      Change password
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input
                        type="password"
                        placeholder="Current password"
                        value={pwCurrent}
                        onChange={(e) => setPwCurrent(e.target.value)}
                        className="h-10 rounded-xl"
                      />
                      <Input
                        type="password"
                        placeholder="New password"
                        value={pwNew}
                        onChange={(e) => setPwNew(e.target.value)}
                        className="h-10 rounded-xl"
                      />
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={pwConfirm}
                        onChange={(e) => setPwConfirm(e.target.value)}
                        className="h-10 rounded-xl"
                      />
                    </div>
                    {pwMsg && (
                      <p className={`text-xs ${pwMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                        {pwMsg.text}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-full"
                      onClick={changePassword}
                      disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
                    >
                      {pwSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : "Update password"}
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-foreground/10 p-5 space-y-3">
                    <Button
                      variant="ghost"
                      className="h-10 rounded-xl justify-start gap-3 px-3 font-normal"
                      onClick={logout}
                    >
                      <LogOut className="size-4 text-muted-foreground" />
                      Log out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </TabsContent>
          </Tabs>
      </div>
    </main>
  );
}
