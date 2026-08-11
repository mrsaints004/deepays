import { createAdminClient } from "@/lib/supabase/server";
import { getWeekStart, formatUSD, timeAgo } from "@/lib/utils";
import type { Task, User, WeeklyPayout } from "@/lib/types/database";
import { TreasuryCard } from "./treasury-card";
import Link from "next/link";
import Image from "next/image";

export default async function AdminPage() {
  const supabase = createAdminClient();
  const weekStart = getWeekStart();

  const [tasksResult, usersResult, payoutsResult, recentCompletionsResult, pendingReviewsResult] =
    await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("users").select("*"),
      supabase.from("weekly_payouts").select("*").eq("week_start", weekStart),
      supabase
        .from("completions")
        .select("*, users(x_username, x_avatar_url), tasks(title, reward_usd)")
        .eq("week_start", weekStart)
        .order("completed_at", { ascending: false })
        .limit(10),
      supabase
        .from("completions")
        .select("id", { count: "exact", head: true })
        .eq("review_status", "pending_review"),
    ]);

  const tasks = (tasksResult.data ?? []) as Task[];
  const users = (usersResult.data ?? []) as User[];
  const payouts = (payoutsResult.data ?? []) as WeeklyPayout[];
  const recentCompletions = (recentCompletionsResult.data ?? []) as Array<{
    id: string; completed_at: string;
    users: { x_username: string; x_avatar_url: string | null } | null;
    tasks: { title: string; reward_usd: number } | null;
  }>;

  const totalOwed = payouts.reduce((sum, p) => sum + p.total_usd, 0);
  const activeTasks = tasks.filter((t) => t.status === "active").length;
  const pendingReviewCount = pendingReviewsResult.count ?? 0;

  return (
    <div className="animate-in">
      <h1 className="text-xl font-bold tracking-tight mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 gap-3 mb-8 sm:grid-cols-2 lg:grid-cols-5 sm:gap-4 stagger-children">
        <div className="rounded-2xl bg-card p-5 border border-border shadow-soft-sm border-l-4 border-l-blue-500">
          <p className="text-[12px] font-medium text-muted uppercase tracking-wider">Total Users</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{users.length}</p>
        </div>

        <div className="rounded-2xl bg-card p-5 border border-border shadow-soft-sm border-l-4 border-l-foreground">
          <p className="text-[12px] font-medium text-muted uppercase tracking-wider">Active Tasks</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{activeTasks}</p>
        </div>

        <div className="rounded-2xl bg-card p-5 border border-border shadow-soft-sm border-l-4 border-l-amber-500">
          <p className="text-[12px] font-medium text-muted uppercase tracking-wider">Owed This Week</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatUSD(totalOwed)}</p>
        </div>

        <Link href="/admin/reviews" className={`rounded-2xl bg-card p-5 border shadow-soft-sm transition-all hover:shadow-soft-md hover:-translate-y-0.5 border-l-4 ${pendingReviewCount > 0 ? "border-l-danger border-danger/30" : "border-border border-l-red-400"}`}>
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-medium text-muted uppercase tracking-wider">Pending Reviews</p>
            {pendingReviewCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">{pendingReviewCount}</span>
            )}
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums">{pendingReviewCount}</p>
        </Link>

        <TreasuryCard />
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted mb-3">Recent Activity</h2>
        {recentCompletions.length > 0 ? (
          <div className="space-y-2 stagger-children">
            {recentCompletions.map((c) => (
              <div key={c.id} className="flex items-start sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-soft-sm">
                <div className="flex items-center gap-3">
                  {c.users?.x_avatar_url ? (
                    <Image src={c.users.x_avatar_url} alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-bold text-white">
                      {c.users?.x_username?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-[14px] font-medium">
                      <span className="font-semibold">@{c.users?.x_username ?? "Unknown"}</span> completed <span className="font-semibold">{c.tasks?.title ?? "a task"}</span>
                    </p>
                    <p className="text-[12px] text-muted">{timeAgo(c.completed_at)}</p>
                  </div>
                </div>
                <span className="text-[14px] font-bold tabular-nums text-accent">+{formatUSD(c.tasks?.reward_usd ?? 0)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted py-8 text-center">No activity this week</p>
        )}
      </div>
    </div>
  );
}
