"use client";

import { useState } from "react";
import { TaskCard } from "@/components/task-card";
import { formatUSD } from "@/lib/utils";
import type { Task } from "@/lib/types/database";

interface CompletionInfo {
  task_id: string;
  review_status: "pending_review" | "approved" | "rejected";
}

interface EarnContentProps {
  tasks: Task[];
  completions: CompletionInfo[];
  userId: string;
  participantCounts: Record<string, number>;
}

const CATEGORIES = ["all", "engagement", "follow", "content", "other"] as const;

export function EarnContent({ tasks, completions, userId, participantCounts }: EarnContentProps) {
  const [completedMap, setCompletedMap] = useState<
    Map<string, "pending_review" | "approved" | "rejected">
  >(() => new Map(completions.map((c) => [c.task_id, c.review_status])));
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const totalTasks = tasks.length;
  const approvedCount = [...completedMap.values()].filter((s) => s === "approved").length;
  const completedCount = completedMap.size;
  const weeklyEarnings = tasks
    .filter((t) => completedMap.get(t.id) === "approved")
    .reduce((sum, t) => sum + t.reward_usd, 0);

  const filteredTasks =
    activeCategory === "all"
      ? tasks
      : tasks.filter((t) => (t.category || "engagement") === activeCategory);

  const availableTasks = filteredTasks.filter((t) => !completedMap.has(t.id));
  const pendingTasks = filteredTasks.filter((t) => completedMap.get(t.id) === "pending_review");
  const approvedTasks = filteredTasks.filter((t) => completedMap.get(t.id) === "approved");
  const rejectedTasks = filteredTasks.filter((t) => completedMap.get(t.id) === "rejected");

  async function handleComplete(taskId: string, proof: { proofUrl?: string; proofImageUrl?: string }) {
    const res = await fetch("/api/tasks/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, userId, ...proof }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to complete task");
    }

    setCompletedMap((prev) => {
      const next = new Map(prev);
      next.set(taskId, "pending_review");
      return next;
    });
  }

  return (
    <div className="animate-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Earn</h1>
        <p className="mt-1 text-[13px] text-muted">Complete tasks to earn weekly rewards</p>
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="mb-6 rounded-2xl bg-card p-5 shadow-soft-sm border border-border animate-pop" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-muted">
              {approvedCount} of {totalTasks} tasks approved
            </span>
            <span className="inline-flex items-center rounded-full bg-accent-light px-3 py-1 text-[13px] font-bold tabular-nums text-accent">
              {formatUSD(weeklyEarnings)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-border/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent animate-shine transition-all duration-700 ease-out"
              style={{ width: `${totalTasks > 0 ? (approvedCount / totalTasks) * 100 : 0}%` }}
            />
          </div>
          {completedCount > approvedCount && (
            <p className="mt-2 text-[12px] text-muted">
              {completedCount - approvedCount} task{completedCount - approvedCount !== 1 ? "s" : ""} pending review
            </p>
          )}
        </div>
      )}

      {/* Category filter tabs */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 animate-fade" style={{ animationDelay: '200ms' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? "bg-foreground text-white"
                : "bg-card text-muted hover:text-foreground border border-border"
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Available tasks */}
      {availableTasks.length > 0 && (
        <div className="stagger-children grid grid-cols-1 gap-3 md:grid-cols-2">
          {availableTasks.map((task) => (
            <TaskCard key={task.id} task={task} isCompleted={false} onComplete={handleComplete} participantCount={participantCounts[task.id]} />
          ))}
        </div>
      )}

      {/* Pending review */}
      {pendingTasks.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            Pending Review
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {pendingTasks.map((task) => (
              <TaskCard key={task.id} task={task} isCompleted={true} reviewStatus="pending_review" onComplete={handleComplete} participantCount={participantCounts[task.id]} />
            ))}
          </div>
        </div>
      )}

      {/* Approved */}
      {approvedTasks.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Approved
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {approvedTasks.map((task) => (
              <TaskCard key={task.id} task={task} isCompleted={true} reviewStatus="approved" onComplete={handleComplete} participantCount={participantCounts[task.id]} />
            ))}
          </div>
        </div>
      )}

      {/* Rejected */}
      {rejectedTasks.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-danger" />
            Rejected
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {rejectedTasks.map((task) => (
              <TaskCard key={task.id} task={task} isCompleted={true} reviewStatus="rejected" onComplete={handleComplete} participantCount={participantCounts[task.id]} />
            ))}
          </div>
        </div>
      )}

      {/* Empty */}
      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-light">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <p className="mt-4 text-[15px] font-medium">No tasks available</p>
          <p className="mt-1 text-[13px] text-muted">Check back soon for new earning opportunities</p>
        </div>
      )}

      {tasks.length > 0 && filteredTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[13px] text-muted">No tasks in this category</p>
        </div>
      )}
    </div>
  );
}
