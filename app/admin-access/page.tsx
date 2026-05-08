"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Lock, Shield, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  plan: "STARTER" | "PRO" | "SCALE";
  subscriptionStatus: "NONE" | "ACTIVE" | "EXPIRED";
  subscriptionEndDate: string | null;
  usageCount: number;
  usageResetAt: string;
  createdAt: string;
  _count: {
    analyses: number;
    integrations: number;
  };
};

const adminPasswordKey = "operon_admin_access_password";

export default function AdminAccessPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState<"PRO" | "SCALE">("SCALE");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const filteredUsers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) =>
      `${user.email} ${user.name ?? ""} ${user.plan} ${user.subscriptionStatus}`.toLowerCase().includes(value),
    );
  }, [query, users]);

  useEffect(() => {
    const savedToken = localStorage.getItem("operon_token");
    const savedPassword = sessionStorage.getItem(adminPasswordKey) || "";
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    setPassword(savedPassword);

    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Login required");
        const profile = await res.json() as { email: string };
        setCurrentEmail(profile.email);
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function loadUsers(nextPassword = password) {
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin-access/users", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-admin-password": nextPassword,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Admin access failed");
      setUsers(data.users as AdminUser[]);
      setAdminEmail(data.adminEmail as string);
      sessionStorage.setItem(adminPasswordKey, nextPassword);
      setMessage({ type: "ok", text: "Admin access unlocked" });
    } catch (error) {
      setUsers([]);
      setMessage({ type: "err", text: error instanceof Error ? error.message : "Admin access failed" });
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(userId: string, action: "grant" | "remove" | "restrict") {
    if (!token) return;
    setActionLoading(`${action}:${userId}`);
    setMessage(null);
    try {
      const res = await fetch("/api/admin-access/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-admin-password": password,
        },
        body: JSON.stringify({ userId, action, plan, days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Action failed");
      setMessage({ type: "ok", text: "User updated" });
      await loadUsers(password);
    } catch (error) {
      setMessage({ type: "err", text: error instanceof Error ? error.message : "Action failed" });
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(value: string | null) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
  }

  function planBadge(user: AdminUser) {
    const active = user.subscriptionStatus === "ACTIVE";
    return active ? "default" : user.subscriptionStatus === "EXPIRED" ? "destructive" : "secondary";
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="size-4" />
              Operon admin
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Admin Access</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Logged in as {currentEmail || "checking account"}. Access requires env email and env password.
            </p>
          </div>
          <Button variant="outline" className="rounded-full" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
        </header>

        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_140px]">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin password from env</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="ADMIN_ACCESS_PASSWORD"
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Grant plan</Label>
              <select
                value={plan}
                onChange={(event) => setPlan(event.target.value as "PRO" | "SCALE")}
                className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm outline-none"
              >
                <option value="PRO">Basic</option>
                <option value="SCALE">Pro</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Days</Label>
              <Input
                type="number"
                min={1}
                max={3650}
                value={days}
                onChange={(event) => setDays(Number(event.target.value) || 30)}
                className="h-10 rounded-xl"
              />
            </div>
          </div>
          <Button className="h-10 rounded-full" onClick={() => loadUsers(password)} disabled={loading || !password}>
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Lock className="size-4" />}
            Unlock
          </Button>
        </section>

        {message ? (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          }`}>
            {message.text}
          </div>
        ) : null}

        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Users</h2>
              <p className="text-sm text-muted-foreground">
                {users.length} users loaded{adminEmail ? ` · admin: ${adminEmail}` : ""}
              </p>
            </div>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users"
              className="h-9 rounded-full sm:max-w-xs"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Ends</th>
                  <th className="px-4 py-3 font-medium">Usage</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isSelf = user.email.toLowerCase() === currentEmail.toLowerCase();
                  return (
                    <tr key={user.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{user.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.name || "No name"} · {user._count.analyses} analyses · {user._count.integrations} integrations
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={planBadge(user)}>
                          {user.plan} · {user.subscriptionStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(user.subscriptionEndDate)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.usageCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            className="h-8 rounded-full text-xs"
                            onClick={() => updateUser(user.id, "grant")}
                            disabled={Boolean(actionLoading)}
                          >
                            {actionLoading === `grant:${user.id}` ? <LoaderCircle className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
                            Grant
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full text-xs"
                            onClick={() => updateUser(user.id, "remove")}
                            disabled={Boolean(actionLoading)}
                          >
                            <Check className="size-3.5" />
                            Remove sub
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 rounded-full text-xs"
                            onClick={() => updateUser(user.id, "restrict")}
                            disabled={Boolean(actionLoading) || isSelf}
                            title={isSelf ? "You cannot restrict your own admin account" : undefined}
                          >
                            {actionLoading === `restrict:${user.id}` ? <LoaderCircle className="size-3.5 animate-spin" /> : <UserMinus className="size-3.5" />}
                            Restrict
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredUsers.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {loading ? "Loading..." : "No users to show. Unlock admin access first."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
