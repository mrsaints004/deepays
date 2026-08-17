import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { getWeekStart, formatUSD } from "@/lib/utils";
import { redirect } from "next/navigation";
import { UserAvatar } from "@/components/user-avatar";
import { WalletConnect } from "@/components/wallet-connect";
import { DeleteAccount } from "@/components/delete-account";
import { LogoutButton } from "@/components/logout-button";
import { BASESCAN_URL } from "@/lib/crypto/config";

const reviewBadges: Record<string, { className: string; label: string }> = {
  pending_review: { className: "bg-warning/10 text-warning", label: "Pending" },
  approved: { className: "bg-success/10 text-success", label: "Approved" },
  rejected: { className: "bg-danger/10 text-danger", label: "Rejected" },
};

export default async function ProfilePage() {
  const user = await getSession();
  if (!user) redirect("/");

  const supabase = await createServerClient();
  const weekStart = getWeekStart();

  const completionsResult = await supabase
    .from("completions")
    .select("*, tasks(*)")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .order("completed_at", { ascending: false });

  const payoutResult = await supabase
    .from("weekly_payouts")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .single();

  const allPayoutsResult = await supabase
    .from("weekly_payouts")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false });

  const txResult = await supabase
    .from("payout_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const completions = (completionsResult.data ?? []) as Array<{
    id: string; task_id: string; completed_at: string;
    review_status: "pending_review" | "approved" | "rejected";
    tasks: { title: string; reward_usd: number } | null;
  }>;
  const weeklyTotal = (payoutResult.data as { total_usd: number } | null)?.total_usd ?? 0;
  const allPayouts = (allPayoutsResult.data ?? []) as Array<{
    id: string; week_start: string; total_usd: number; status: "pending" | "paid";
    tx_hash: string | null; paid_amount_usdc: number | null;
  }>;
  const transactions = (txResult.data ?? []) as Array<{
    id: string; payout_id: string; tx_hash: string | null; status: string;
  }>;

  const approvedCompletions = completions.filter((c) => c.review_status === "approved");
  const approvedTotal = approvedCompletions.reduce((sum, c) => sum + (c.tasks?.reward_usd ?? 0), 0);
  const calculatedTotal = weeklyTotal || approvedTotal;

  const txByPayout = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const list = txByPayout.get(tx.payout_id) ?? [];
    list.push(tx);
    txByPayout.set(tx.payout_id, list);
  }

  return (
    <div className="animate-in">
      <div className="lg:flex lg:items-start lg:gap-6">
        {/* Avatar + username */}
        <div className="flex flex-col items-center pt-4 lg:flex-shrink-0 lg:pt-0">
          <UserAvatar username={user.x_username} avatarUrl={user.x_avatar_url} size="lg" />
          <h1 className="mt-3 text-lg font-bold tracking-tight">@{user.x_username}</h1>
          {user.email && <p className="mt-0.5 text-[12px] text-muted">{user.email}</p>}
        </div>

        {/* Earnings */}
        <div className="mt-6 flex-1 lg:mt-0">
          <div className="rounded-2xl bg-hero p-6 text-center shadow-soft-lg animate-pop" style={{ animationDelay: '100ms' }}>
            <p className="text-[13px] font-medium text-white/50">This week (approved)</p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-emerald-400">{formatUSD(calculatedTotal)}</p>
            <p className="mt-2 text-[12px] text-white/30">Resets every Monday at 00:00 UTC</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 stagger-children">
            <div className="rounded-2xl bg-card p-4 text-center border border-border shadow-soft-sm">
              <p className="text-2xl font-bold tabular-nums">{approvedCompletions.length}</p>
              <p className="mt-0.5 text-[12px] text-muted">Tasks approved</p>
            </div>
            <div className="rounded-2xl bg-card p-4 text-center border border-border shadow-soft-sm">
              <p className="text-2xl font-bold tabular-nums text-accent">{formatUSD(calculatedTotal)}</p>
              <p className="mt-0.5 text-[12px] text-muted">Earned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet */}
      <div className="mt-8">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted">Wallet Settings</h2>
        <WalletConnect currentAddress={user.wallet_address} />
      </div>

      {/* Payout History */}
      <div className="mt-8">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted">Payout History</h2>
        {allPayouts.length > 0 ? (
          <div className="space-y-2">
            {allPayouts.map((payout) => {
              const payoutTxs = txByPayout.get(payout.id) ?? [];
              const latestTx = payoutTxs[0];
              return (
                <div key={payout.id} className="rounded-xl border border-border bg-card p-4 shadow-soft-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-semibold">Week of {payout.week_start}</p>
                      <p className="text-[12px] text-muted">
                        {formatUSD(payout.total_usd)}
                        {payout.paid_amount_usdc != null && ` (${payout.paid_amount_usdc} USDC)`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${payout.status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        {payout.status}
                      </span>
                      {(payout.tx_hash || latestTx?.tx_hash) && (
                        <a href={`${BASESCAN_URL}/tx/${payout.tx_hash || latestTx?.tx_hash}`} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[11px] font-mono text-accent hover:underline transition-colors">
                          View on BaseScan
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-muted py-8 text-center">No payouts yet</p>
        )}
      </div>

      {/* Completed tasks */}
      <div className="mt-8">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted">Completed this week</h2>
        {completions.length > 0 ? (
          <div className="stagger-children grid grid-cols-1 gap-2 lg:grid-cols-2">
            {completions.map((completion) => {
              const badge = reviewBadges[completion.review_status];
              return (
                <div key={completion.id} className="flex items-center justify-between rounded-xl bg-card border border-border px-4 py-3 shadow-soft-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <span className="text-[14px] font-medium">{completion.tasks?.title ?? "Task"}</span>
                    {badge && <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>}
                  </div>
                  <span className="text-[14px] font-semibold tabular-nums text-success">+{formatUSD(completion.tasks?.reward_usd ?? 0)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-[13px] text-muted">No tasks completed yet this week</p>
          </div>
        )}
      </div>

      {/* Account Management */}
      <div className="mt-8">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted">Account</h2>
        <DeleteAccount />
      </div>

      <div className="mt-10 flex justify-center lg:hidden">
        <LogoutButton className="text-[13px] font-medium text-muted transition-colors hover:text-foreground" />
      </div>
    </div>
  );
}
