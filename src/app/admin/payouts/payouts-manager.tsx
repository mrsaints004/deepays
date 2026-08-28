"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatUSD } from "@/lib/utils";
import type { WeeklyPayout } from "@/lib/types/database";
import { BASESCAN_URL } from "@/lib/crypto/config";
import { useUsdcTransfer } from "@/lib/crypto/use-usdc-transfer";
import { useToast } from "@/components/toast";
import { Send, CheckCircle, Download, Loader2, ChevronLeft, ChevronRight, Wallet } from "lucide-react";

const PAGE_SIZE = 20;

type PayoutRow = WeeklyPayout & {
  users: { x_username: string; wallet_address: string | null } | null;
};

interface PayoutsManagerProps {
  initialPayouts: PayoutRow[];
  weeks: string[];
  initialWeek: string;
}

export function PayoutsManager({ initialPayouts, weeks, initialWeek }: PayoutsManagerProps) {
  const [payouts, setPayouts] = useState(initialPayouts);
  const [selectedWeek, setSelectedWeek] = useState(initialWeek);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [page, setPage] = useState(0);

  const { isConnected } = useAccount();
  const { sendUSDC } = useUsdcTransfer();
  const { toast, confirm } = useToast();

  const totalPages = Math.max(1, Math.ceil(payouts.length / PAGE_SIZE));
  const paginatedPayouts = payouts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pendingCount = payouts.filter((p) => p.status === "pending").length;
  const paidCount = payouts.filter((p) => p.status === "paid").length;
  const totalPending = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.total_usd, 0);
  const totalPaid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.total_usd, 0);

  async function loadWeek(week: string) {
    setSelectedWeek(week); setLoadingWeek(true); setPage(0);
    try { const res = await fetch(`/api/admin/payouts?week=${encodeURIComponent(week)}`); if (res.ok) { const data = await res.json(); setPayouts(data.payouts); } } finally { setLoadingWeek(false); }
  }

  async function walletPay(payoutId: string) {
    setSendingIds((prev) => new Set([...prev, payoutId]));
    try {
      // 1. Lock the payout
      const lockRes = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock", payoutId }),
      });
      if (!lockRes.ok) {
        const err = await lockRes.json();
        toast(`Lock failed: ${err.error}`, "error");
        return;
      }
      const { walletAddress, amountUSD } = await lockRes.json();

      // Update UI to show processing
      setPayouts((prev) => prev.map((p) => p.id === payoutId ? { ...p, status: "processing" as WeeklyPayout["status"] } : p));

      try {
        // 2. Sign transaction via MetaMask
        const txHash = await sendUSDC(walletAddress, amountUSD);

        // 3. Confirm on server
        await fetch("/api/admin/payouts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "confirm", payoutId, txHash }),
        });

        setPayouts((prev) => prev.map((p) => p.id === payoutId ? { ...p, status: "paid" as const, tx_hash: txHash, paid_at: new Date().toISOString() } : p));
        toast("Payout sent successfully", "success");
      } catch (err) {
        // 3b. Revert on wallet rejection/failure
        await fetch("/api/admin/payouts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "revert", payoutId }),
        });
        setPayouts((prev) => prev.map((p) => p.id === payoutId ? { ...p, status: "pending" as const } : p));
        toast(err instanceof Error ? err.message : "Transaction failed or was rejected", "error");
      }
    } finally {
      setSendingIds((prev) => { const next = new Set(prev); next.delete(payoutId); return next; });
    }
  }

  async function markPaid(payoutId: string) {
    if (!(await confirm("Mark this payout as paid? This requires a valid transaction hash."))) return;
    const txHashInput = window.prompt("Enter the transaction hash (0x...):");
    if (!txHashInput || !/^0x[a-fA-F0-9]{64}$/.test(txHashInput)) {
      toast("A valid transaction hash is required", "error");
      return;
    }
    const reason = window.prompt("Reason for manual mark (required):");
    if (!reason || reason.trim().length < 3) {
      toast("A reason is required (at least 3 characters)", "error");
      return;
    }
    try {
      const res = await fetch("/api/admin/payouts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payoutId, status: "paid", tx_hash: txHashInput, reason }) });
      if (res.ok) {
        setPayouts((prev) => prev.map((p) => p.id === payoutId ? { ...p, status: "paid" as const, tx_hash: txHashInput, paid_at: new Date().toISOString() } : p));
        toast("Payout marked as paid", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to mark as paid", "error");
      }
    } catch {
      toast("Network error. Please try again.", "error");
    }
  }

  async function bulkPayAll() {
    const pendingWithWallet = payouts.filter((p) => p.status === "pending" && p.users?.wallet_address);
    if (pendingWithWallet.length === 0) return;
    if (!(await confirm(`Sign ${pendingWithWallet.length} transactions via wallet?`))) return;

    setBulkSending(true);
    setBulkProgress({ current: 0, total: pendingWithWallet.length });

    for (let i = 0; i < pendingWithWallet.length; i++) {
      setBulkProgress({ current: i + 1, total: pendingWithWallet.length });
      await walletPay(pendingWithWallet[i].id);
    }

    setBulkSending(false);
    setBulkProgress({ current: 0, total: 0 });
  }

  function exportCSV() {
    const esc = (f: string) => f.includes(",") || f.includes('"') || f.includes("\n") ? `"${f.replace(/"/g, '""')}"` : f;
    const rows = [["Username", "Amount USD", "Wallet", "Status", "Tx Hash", "Week"]];
    payouts.forEach((p) => rows.push([esc(p.users?.x_username ?? "Unknown"), String(p.total_usd), esc(p.users?.wallet_address ?? ""), p.status, esc(p.tx_hash ?? ""), p.week_start]));
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `depay-payouts-${selectedWeek}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      paid: "bg-success/10 text-success",
      pending: "bg-warning/10 text-warning",
      processing: "bg-blue-500/10 text-blue-500",
    };
    const dotStyles: Record<string, string> = {
      paid: "bg-success",
      pending: "bg-warning",
      processing: "bg-blue-500",
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[status] ?? "bg-muted/10 text-muted"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status] ?? "bg-muted"}`} />{status}
      </span>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight">Payouts</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select value={selectedWeek} onChange={(e) => loadWeek(e.target.value)} className="rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-semibold outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 min-w-0 flex-1 sm:flex-none">
            {weeks.map((w) => <option key={w} value={w}>Week of {w}</option>)}
          </select>
          {pendingCount > 0 && (
            isConnected ? (
              <button onClick={bulkPayAll} disabled={bulkSending} className="rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                {bulkSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span className="hidden sm:inline">{bulkSending ? `Signing ${bulkProgress.current}/${bulkProgress.total}` : `Pay All Pending (${pendingCount})`}</span>
                <span className="sm:hidden">{bulkSending ? `${bulkProgress.current}/${bulkProgress.total}` : `Pay All (${pendingCount})`}</span>
              </button>
            ) : (
              <span className="rounded-xl bg-muted/10 px-4 py-2 text-[13px] font-semibold text-muted flex items-center gap-2">
                <Wallet size={14} /> <span className="hidden sm:inline">Connect wallet to pay</span><span className="sm:hidden">Connect</span>
              </span>
            )
          )}
          <button onClick={exportCSV} className="rounded-xl border border-border px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-card-hover active:scale-[0.98] flex items-center gap-2">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-2 mb-6 sm:gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-card border border-border p-4 shadow-soft-sm">
          <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Pending</p>
          <p className="text-lg font-bold tabular-nums">{pendingCount}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 shadow-soft-sm">
          <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Pending Amount</p>
          <p className="text-lg font-bold tabular-nums">{formatUSD(totalPending)}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 shadow-soft-sm">
          <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Paid</p>
          <p className="text-lg font-bold tabular-nums text-accent">{paidCount}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 shadow-soft-sm">
          <p className="text-[11px] font-medium text-muted uppercase tracking-wider">Total Paid</p>
          <p className="text-lg font-bold tabular-nums text-accent">{formatUSD(totalPaid)}</p>
        </div>
      </div>

      {loadingWeek ? (
        <div className="py-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-accent" /></div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-soft-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">Wallet</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">Tx Hash</th>
                <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayouts.map((payout, i) => (
                <tr key={payout.id} className={`border-b border-border last:border-0 transition-colors hover:bg-accent-light/40 ${i % 2 === 0 ? "bg-card" : "bg-background"}`}>
                  <td className="px-4 py-3 text-[14px] font-semibold">@{payout.users?.x_username ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-[14px] font-semibold tabular-nums">{formatUSD(payout.total_usd)}</td>
                  <td className="px-4 py-3">{payout.users?.wallet_address ? <span className="text-[12px] font-mono text-muted">{payout.users.wallet_address.slice(0, 6)}...{payout.users.wallet_address.slice(-4)}</span> : <span className="text-[12px] text-danger font-medium">No wallet</span>}</td>
                  <td className="px-4 py-3">{statusBadge(payout.status)}</td>
                  <td className="px-4 py-3">{payout.tx_hash ? <a href={`${BASESCAN_URL}/tx/${payout.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-[12px] font-mono text-accent hover:underline">{payout.tx_hash.slice(0, 10)}...</a> : <span className="text-[12px] text-muted">—</span>}</td>
                  <td className="px-4 py-3">{payout.status === "pending" && (
                    <div className="flex items-center justify-end gap-1">
                      {payout.users?.wallet_address && (
                        isConnected ? (
                          <button onClick={() => walletPay(payout.id)} disabled={sendingIds.has(payout.id)} className="rounded-lg p-2 text-muted hover:bg-success/10 hover:text-success transition-colors disabled:opacity-50" title="Send via Wallet">
                            {sendingIds.has(payout.id) ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted flex items-center gap-1"><Wallet size={14} /> Connect</span>
                        )
                      )}
                      <button onClick={() => markPaid(payout.id)} className="rounded-lg p-2 text-muted hover:bg-accent-light hover:text-accent transition-colors" title="Mark Paid"><CheckCircle size={16} /></button>
                    </div>
                  )}</td>
                </tr>
              ))}
              {payouts.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-[13px] text-muted">No payouts for this week</td></tr>}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[12px] text-muted">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, payouts.length)} of {payouts.length}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="rounded-lg p-2 text-muted hover:bg-card-hover hover:text-foreground transition-colors disabled:opacity-30"><ChevronLeft size={16} /></button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)} className={`rounded-lg px-3 py-1 text-[13px] font-medium transition-colors ${page === i ? "bg-foreground text-white" : "text-muted hover:bg-card-hover"}`}>{i + 1}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-lg p-2 text-muted hover:bg-card-hover hover:text-foreground transition-colors disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </>
  );
}
