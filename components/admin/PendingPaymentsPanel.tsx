"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, LoaderCircle, Search, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AdminPayment = {
  id: string;
  plan: "STARTER" | "PRO" | "SCALE";
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCEEDED" | "CANCELED";
  displayStatus: "Pending" | "Approved" | "Rejected";
  providerPaymentId: string | null;
  customerName: string | null;
  email: string;
  cardDisplay: string;
  country: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  privateNotes: string | null;
  fraudFlags: string[];
  createdAt: string;
  auditLogs: Array<{ id: string; action: string; adminEmail: string; reason: string | null; notes: string | null; createdAt: string }>;
};

const statusOptions = [
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["all", "All"],
] as const;

function planLabel(plan: AdminPayment["plan"]) {
  if (plan === "SCALE") return "Business";
  if (plan === "PRO") return "Pro";
  return "Starter";
}

function money(payment: AdminPayment) {
  return `${payment.currency} ${(payment.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusVariant(status: AdminPayment["displayStatus"]) {
  if (status === "Approved") return "default";
  if (status === "Rejected") return "destructive";
  return "secondary";
}

export function PendingPaymentsPanel({ token, password }: { token: string | null; password: string }) {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statusOptions)[number][0]>("pending");
  const [plan, setPlan] = useState("all");
  const [currency, setCurrency] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activePayment, setActivePayment] = useState<AdminPayment | null>(null);
  const [rejectPayment, setRejectPayment] = useState<AdminPayment | null>(null);
  const [notesPayment, setNotesPayment] = useState<AdminPayment | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedPayments = useMemo(() => payments.filter((payment) => selected.has(payment.id)), [payments, selected]);

  async function loadPayments() {
    if (!token || !password) return;
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ status, sort, dir });
      if (query.trim()) params.set("q", query.trim());
      if (plan !== "all") params.set("plan", plan);
      if (currency.trim()) params.set("currency", currency.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin-access/payments?${params}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}`, "x-admin-password": password },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Unable to load payments");
      setPayments(data.payments as AdminPayment[]);
      setSelected(new Set());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, password, status, sort, dir]);

  async function runAction(payment: AdminPayment, action: "approve" | "reject" | "notes", payload: { reason?: string; notes?: string } = {}) {
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin-access/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-admin-password": password },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Action failed");
      setMessage(action === "approve" ? "Payment approved and subscription activated" : action === "reject" ? "Payment rejected" : "Notes saved");
      setRejectPayment(null);
      setNotesPayment(null);
      setReason("");
      setNotes("");
      await loadPayments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  async function approveSelected() {
    if (!token || selectedPayments.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin-access/payments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-admin-password": password },
        body: JSON.stringify({ paymentIds: selectedPayments.map((payment) => payment.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Bulk approve failed");
      setMessage(`${data.approved.length} payments approved`);
      await loadPayments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bulk approve failed");
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!token || !password) return;
    const url = `/api/admin-access/payments/export`;
    fetch(url, { headers: { Authorization: `Bearer ${token}`, "x-admin-password": password } })
      .then((res) => res.blob())
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = `operon-payments-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(objectUrl);
      })
      .catch(() => setMessage("CSV export failed"));
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">Pending Payments</h2>
            <p className="text-sm text-muted-foreground">Approve, reject, audit, and export payment attempts. CVC is never stored or displayed.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-9 rounded-full" onClick={exportCsv} disabled={!password}>
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button className="h-9 rounded-full" onClick={approveSelected} disabled={selectedPayments.length === 0 || loading}>
              Approve selected ({selectedPayments.length})
            </Button>
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-[1.4fr_130px_130px_120px_150px_150px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search email, name, payment ID" className="h-9 rounded-full pl-9" />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-9 rounded-full border border-input bg-background px-3 text-sm">
            {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={plan} onChange={(event) => setPlan(event.target.value)} className="h-9 rounded-full border border-input bg-background px-3 text-sm">
            <option value="all">All plans</option>
            <option value="PRO">Pro</option>
            <option value="SCALE">Business</option>
          </select>
          <Input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} placeholder="Currency" className="h-9 rounded-full" />
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-9 rounded-full" />
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-9 rounded-full" />
          <Button variant="outline" className="h-9 rounded-full" onClick={loadPayments} disabled={loading || !password}>
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : "Apply"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <button className="rounded-full border border-border px-3 py-1" onClick={() => { setSort("createdAt"); setDir(dir === "desc" ? "asc" : "desc"); }}>
            Sort timestamp {sort === "createdAt" ? dir : ""}
          </button>
          <button className="rounded-full border border-border px-3 py-1" onClick={() => { setSort("amount"); setDir(dir === "desc" ? "asc" : "desc"); }}>
            Sort amount {sort === "amount" ? dir : ""}
          </button>
        </div>
        {message ? <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">{message}</div> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3"><input type="checkbox" checked={payments.length > 0 && selected.size === payments.length} onChange={(event) => setSelected(event.target.checked ? new Set(payments.map((payment) => payment.id)) : new Set())} /></th>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Card</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Country</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(payment.id)} onChange={(event) => setSelected((current) => {
                  const next = new Set(current);
                  if (event.target.checked) next.add(payment.id);
                  else next.delete(payment.id);
                  return next;
                })} /></td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(payment.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">{payment.customerName || "Unknown"}</td>
                <td className="px-4 py-3">{payment.email}</td>
                <td className="px-4 py-3">{payment.cardDisplay}</td>
                <td className="px-4 py-3">{planLabel(payment.plan)}</td>
                <td className="px-4 py-3">{money(payment)}</td>
                <td className="px-4 py-3">{payment.country || "-"}</td>
                <td className="px-4 py-3"><Badge variant={statusVariant(payment.displayStatus)}>{payment.displayStatus}</Badge></td>
                <td className="px-4 py-3">
                  {payment.fraudFlags.length ? (
                    <span className="inline-flex items-center gap-1 text-amber-600"><ShieldAlert className="size-4" /> {payment.fraudFlags.length}</span>
                  ) : <span className="text-muted-foreground">Clear</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => setActivePayment(payment)}><Eye className="size-3" /> View</Button>
                    <Button size="sm" className="h-8 rounded-full text-xs" onClick={() => runAction(payment, "approve")} disabled={loading || payment.displayStatus === "Approved"}>Approve</Button>
                    <Button size="sm" variant="destructive" className="h-8 rounded-full text-xs" onClick={() => setRejectPayment(payment)} disabled={loading || payment.displayStatus === "Rejected"}>Reject</Button>
                    <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={() => { setNotesPayment(payment); setNotes(payment.privateNotes ?? ""); }}>Notes</Button>
                  </div>
                </td>
              </tr>
            ))}
            {!payments.length ? (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">No payments match these filters.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(activePayment)} onOpenChange={() => setActivePayment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Payment details</DialogTitle></DialogHeader>
          {activePayment ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div><span className="text-muted-foreground">Payment ID</span><div className="font-mono text-xs">{activePayment.id}</div></div>
                <div><span className="text-muted-foreground">Provider ID</span><div className="font-mono text-xs">{activePayment.providerPaymentId || "-"}</div></div>
                <div><span className="text-muted-foreground">Customer</span><div>{activePayment.customerName || "Unknown"} · {activePayment.email}</div></div>
                <div><span className="text-muted-foreground">Card</span><div>{activePayment.cardDisplay}</div></div>
              </div>
              {activePayment.fraudFlags.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">{activePayment.fraudFlags.join(", ")}</div> : null}
              <div>
                <div className="mb-2 font-medium">Audit log</div>
                <div className="space-y-2">
                  {activePayment.auditLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-border px-3 py-2 text-xs">
                      {log.action} by {log.adminEmail} · {new Date(log.createdAt).toLocaleString()}
                      {log.reason ? <div>Reason: {log.reason}</div> : null}
                      {log.notes ? <div>Notes: {log.notes}</div> : null}
                    </div>
                  ))}
                  {!activePayment.auditLogs.length ? <div className="text-muted-foreground">No audit events yet.</div> : null}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectPayment)} onOpenChange={() => setRejectPayment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject payment</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Rejection reason (optional)</Label>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason shown in the customer email" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectPayment(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectPayment && runAction(rejectPayment, "reject", { reason })}>Reject and email customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(notesPayment)} onOpenChange={() => setNotesPayment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Private notes</DialogTitle></DialogHeader>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Internal note for admins only" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesPayment(null)}>Cancel</Button>
            <Button onClick={() => notesPayment && runAction(notesPayment, "notes", { notes })}>Save notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
