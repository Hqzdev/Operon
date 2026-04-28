"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Crown,
  KeyRound,
  LoaderCircle,
  LogOut,
  Minus,
  Plus,
  Settings,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  type AnalysisHistoryItem,
  type AnalysisInput,
  type AnalysisOutput,
} from "@/lib/analysis-schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

const emptyAdSet = (): AdSetInput => ({
  name: "", spend: 0, impressions: 0, clicks: 0,
  add_to_cart: 0, purchases: 0, revenue: 0, product_price: 0, cost: 0,
});

const STARTER_LIMIT = 10;

function planLabel(plan?: string | null) {
  if (plan === "PRO") return "Basic";
  if (plan === "SCALE") return "Pro";
  if (plan === "STARTER") return "Starter";
  return "—";
}

export function AnalysisWorkbench() {
  const router = useRouter();

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
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

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

        const [profileRes, historyRes] = await Promise.all([
          fetch(`${apiBaseUrl}/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiBaseUrl}/analysis`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } }),
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
      } catch {
        if (isMounted) setHistory([]);
      }
    }

    loadInitial();
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function deleteAccount() {
    if (!deletePassword) return;
    const token = getToken();
    if (!token) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/users/me`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!res.ok) {
        const data = await res.json() as { message?: string };
        alert(data.message ?? "Failed to delete account");
        return;
      }
      logout();
    } catch {
      alert("Network error");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function upgradePlan(plan: "PRO" | "SCALE") {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiBaseUrl}/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as { confirmationUrl?: string; message?: string };
      if (!res.ok) { alert(data.message ?? "Payment initialization failed"); return; }
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      } else {
        alert(data.message ?? "YooKassa not configured. Add YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY to .env");
      }
    } catch {
      alert("Network error");
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

  function updateAdSet(index: number, field: keyof AdSetInput, value: string) {
    setAdSets((prev) => prev.map((s, i) => {
      if (i !== index) return s;
      return { ...s, [field]: field === "name" ? value : Number(value) };
    }));
  }

  const hasProFeatures = user?.plan === "SCALE";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(20,20,20,0.08),transparent_25%),radial-gradient(circle_at_center_right,rgba(20,20,20,0.05),transparent_30%)]" />
      <div className="mx-auto max-w-[1440px] px-6 py-6 lg:px-10">
        <header className="mb-8 flex items-center justify-between rounded-[28px] border border-foreground/10 bg-background/80 px-6 py-5 backdrop-blur">
          <div>
            <div className="font-display text-2xl tracking-tight">Operon Analysis Workbench</div>
            <div className="font-mono text-xs text-muted-foreground">
              Decision engine, diagnosis, action plan, and product validation
            </div>
          </div>
          <Link href="/docs" target="_blank">
            <Button variant="outline" size="sm" className="h-9 rounded-full gap-2">
              <BookOpen className="size-3.5" />
              Docs
            </Button>
          </Link>
        </header>

        {/* ── bottom-left dock ── */}
        <div className="fixed bottom-6 left-6 z-50 flex flex-col items-center gap-2">

          {/* Profile popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex size-11 items-center justify-center rounded-2xl border border-foreground/10 bg-background/90 shadow-lg backdrop-blur transition hover:bg-muted">
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs font-medium">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="end" className="w-64 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="size-10">
                  <AvatarFallback className="text-sm font-semibold">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user?.name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email ?? "—"}</p>
                </div>
              </div>
              <Separator className="mb-3" />
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Plan</span>
                  <span className="font-medium text-foreground">{planLabel(user?.plan)}</span>
                </div>
                {user?.plan === "STARTER" && (
                  <div className="flex justify-between">
                    <span>Analyses used</span>
                    <span className="font-medium text-foreground">{user.usageCount}/{STARTER_LIMIT}</span>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Settings dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex size-11 items-center justify-center rounded-2xl border border-foreground/10 bg-background/90 shadow-lg backdrop-blur transition hover:bg-muted">
                <Settings className="size-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 gap-0">
              <DialogHeader className="mb-6">
                <DialogTitle className="font-display text-2xl">Settings</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Manage your account
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">

                {/* Profile block */}
                <div className="rounded-2xl border border-foreground/10 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Profile
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <div className="flex h-10 w-full items-center rounded-xl border border-foreground/10 bg-muted/40 px-3 text-sm">
                      {user?.email ?? "—"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="settings-name" className="text-sm">Name</Label>
                    <Input
                      id="settings-name"
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
                    className="h-9 w-full rounded-full"
                    onClick={saveProfile}
                    disabled={settingsSaving}
                  >
                    {settingsSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : "Save changes"}
                  </Button>
                </div>

                {/* Plan block */}
                <div className="rounded-2xl border border-foreground/10 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    <Crown className="size-3.5" />
                    Plan
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current plan</span>
                    <Badge variant="outline" className="rounded-full font-mono text-xs">
                      {planLabel(user?.plan)}
                    </Badge>
                  </div>

                  {user?.plan === "STARTER" && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Analyses this month</span>
                        <span className="font-medium tabular-nums">
                          {user.usageCount}/{STARTER_LIMIT}
                        </span>
                      </div>
                      <Progress
                        value={Math.min((user.usageCount / STARTER_LIMIT) * 100, 100)}
                        className="h-1.5"
                      />
                    </div>
                  )}

                  {user?.subscriptionStatus === "ACTIVE" && user.subscriptionEndDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Renews</span>
                      <span className="tabular-nums">
                        {new Date(user.subscriptionEndDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {user?.plan === "SCALE" ? (
                    <p className="text-xs text-muted-foreground">You have full access to all features.</p>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {user?.plan === "STARTER" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-full rounded-full"
                          onClick={() => upgradePlan("PRO")}
                        >
                          Upgrade to Basic · $9/mo
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-9 w-full rounded-full gap-2"
                        onClick={() => upgradePlan("SCALE")}
                      >
                        <TrendingUp className="size-3.5" />
                        {user?.plan === "PRO" ? "Upgrade to Pro · $19/mo" : "Go to Pro · $19/mo"}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground pt-1">
                        Pro unlocks Budget Allocation and Scenario Simulator
                      </p>
                    </div>
                  )}
                </div>

                {/* Password block */}
                <div className="rounded-2xl border border-foreground/10 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    <KeyRound className="size-3.5" />
                    Change password
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="pw-current" className="text-sm">Current password</Label>
                    <Input
                      id="pw-current"
                      type="password"
                      value={pwCurrent}
                      onChange={(e) => setPwCurrent(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="pw-new" className="text-sm">New password</Label>
                    <Input
                      id="pw-new"
                      type="password"
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="pw-confirm" className="text-sm">Confirm new password</Label>
                    <Input
                      id="pw-confirm"
                      type="password"
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
                    className="h-9 w-full rounded-full"
                    onClick={changePassword}
                    disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
                  >
                    {pwSaving ? <LoaderCircle className="size-3.5 animate-spin" /> : "Update password"}
                  </Button>
                </div>

                {/* Actions */}
                <div className="rounded-2xl border border-foreground/10 p-5 space-y-2">
                  <Button
                    variant="ghost"
                    className="h-10 w-full rounded-xl justify-start gap-3 px-3 font-normal"
                    onClick={logout}
                  >
                    <LogOut className="size-4 text-muted-foreground" />
                    Log out
                  </Button>

                  <Separator />

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-10 w-full rounded-xl justify-start gap-3 px-3 font-normal text-red-600 hover:text-red-600 hover:bg-red-50/60"
                      >
                        <Trash2 className="size-4" />
                        Delete account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete account</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete your account and all analyses. Enter your password to confirm.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Input
                        type="password"
                        placeholder="Your password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className="h-10 rounded-xl"
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full" onClick={() => setDeletePassword("")}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-full bg-red-600 hover:bg-red-700"
                          onClick={deleteAccount}
                          disabled={!deletePassword || deleteLoading}
                        >
                          {deleteLoading ? <LoaderCircle className="size-3.5 animate-spin" /> : "Delete permanently"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

              </div>
            </DialogContent>
          </Dialog>
        </div>
        {/* ── end dock ── */}

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 rounded-2xl h-11 px-1">
            <TabsTrigger value="analysis" className="rounded-xl h-9 px-4">
              Analysis
            </TabsTrigger>
            <TabsTrigger value="budget" className="rounded-xl h-9 px-4 gap-1.5">
              {!hasProFeatures && <Crown className="size-3 text-amber-500" />}
              Budget Allocation
            </TabsTrigger>
            <TabsTrigger value="scenario" className="rounded-xl h-9 px-4 gap-1.5">
              {!hasProFeatures && <Crown className="size-3 text-amber-500" />}
              Scenario Simulator
            </TabsTrigger>
          </TabsList>

          {/* ── Analysis tab ── */}
          <TabsContent value="analysis">
            <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
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
                          value={form[field.key]}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              [field.key]:
                                field.step === "1"
                                  ? Number.parseInt(event.target.value || "0", 10)
                                  : Number.parseFloat(event.target.value || "0"),
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

            <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
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
          <TabsContent value="budget">
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
              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
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
                        value={budgetTotal}
                        onChange={(e) => setBudgetTotal(Number(e.target.value))}
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
                                    value={set[field] as number}
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
          <TabsContent value="scenario">
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
              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
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
                              value={scenarioBase[field]}
                              onChange={(e) => setScenarioBase((prev) => ({ ...prev, [field]: Number(e.target.value) }))}
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
                              value={value}
                              onChange={(e) => setter(Number(e.target.value))}
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
        </Tabs>
      </div>
    </main>
  );
}
