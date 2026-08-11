"use client";

import { useState } from "react";
import Image from "next/image";
import { formatUSD, timeAgo } from "@/lib/utils";

interface Review {
  id: string; user_id: string; task_id: string; completed_at: string;
  proof_url: string | null; proof_image_url: string | null; review_status: string;
  reviewer_note?: string | null; reviewed_at?: string | null;
  users: { id: string; x_username: string; email: string | null; x_avatar_url: string | null } | null;
  tasks: { id: string; title: string; reward_usd: number; category: string; action_url: string } | null;
}

interface ReviewsManagerProps {
  pendingReviews: Review[];
  approvedReviews: Review[];
  rejectedReviews: Review[];
}

type Tab = "pending" | "approved" | "rejected";

export function ReviewsManager({ pendingReviews: initialPending, approvedReviews, rejectedReviews }: ReviewsManagerProps) {
  const [pending, setPending] = useState(initialPending);
  const [approved, setApproved] = useState(approvedReviews);
  const [rejected, setRejected] = useState(rejectedReviews);
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [processing, setProcessing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  async function handleReview(completionId: string, action: "approve" | "reject") {
    setProcessing(completionId);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionId, action, note: notes[completionId] || undefined }),
      });
      if (!res.ok) throw new Error("Failed to review");

      const reviewedItem = pending.find((r) => r.id === completionId);
      setPending((prev) => prev.filter((r) => r.id !== completionId));
      if (reviewedItem) {
        const updated = { ...reviewedItem, review_status: action === "approve" ? "approved" : "rejected", reviewer_note: notes[completionId] || null, reviewed_at: new Date().toISOString() };
        if (action === "approve") setApproved((prev) => [updated, ...prev]);
        else setRejected((prev) => [updated, ...prev]);
      }
      setToast(action === "approve" ? "Submission approved" : "Submission rejected");
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast("Failed to process review");
      setTimeout(() => setToast(null), 3000);
    } finally { setProcessing(null); }
  }

  const categoryDot: Record<string, string> = { engagement: "bg-blue-500", follow: "bg-purple-500", content: "bg-amber-500", other: "bg-muted" };
  const tabs: { key: Tab; label: string; count: number; color: string }[] = [
    { key: "pending", label: "Pending", count: pending.length, color: "bg-warning" },
    { key: "approved", label: "Approved", count: approved.length, color: "bg-success" },
    { key: "rejected", label: "Rejected", count: rejected.length, color: "bg-danger" },
  ];
  const currentReviews = activeTab === "pending" ? pending : activeTab === "approved" ? approved : rejected;

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-foreground px-4 py-3 text-[13px] font-medium text-white shadow-soft-lg animate-in">{toast}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold tracking-tight">Reviews</h1>
      </div>

      <div className="flex items-center gap-1 mb-6 p-1 bg-background rounded-xl border border-border w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${activeTab === tab.key ? "bg-card text-foreground shadow-soft-sm" : "text-muted hover:text-foreground"}`}>
            {tab.label}
            <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white ${tab.color}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {currentReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-light">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <p className="mt-4 text-[15px] font-medium">{activeTab === "pending" ? "All caught up" : `No ${activeTab} reviews`}</p>
          <p className="mt-1 text-[13px] text-muted">{activeTab === "pending" ? "No pending submissions to review" : `No ${activeTab} submissions found`}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentReviews.map((review) => {
            const category = review.tasks?.category || "engagement";
            return (
              <div key={review.id} className={`rounded-2xl border bg-card p-5 shadow-soft-sm border-l-4 ${activeTab === "pending" ? "border-border border-l-warning" : activeTab === "approved" ? "border-border border-l-success" : "border-border border-l-danger"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {review.users?.x_avatar_url ? <Image src={review.users.x_avatar_url} alt="" width={24} height={24} className="h-6 w-6 rounded-full" /> : <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-white">{review.users?.x_username?.charAt(0)?.toUpperCase() ?? "?"}</div>}
                      <span className="text-[14px] font-semibold">@{review.users?.x_username ?? "Unknown"}</span>
                      {review.users?.email && <span className="text-[12px] text-muted">({review.users.email})</span>}
                    </div>
                    <p className="mt-1 text-[14px] font-medium">{review.tasks?.title ?? "Unknown task"}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider">
                        <span className={`h-1.5 w-1.5 rounded-full ${categoryDot[category] || categoryDot.other}`} />{category}
                      </span>
                      <span className="text-[12px] text-muted">{timeAgo(review.completed_at)}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 rounded-xl bg-accent px-3 py-1.5">
                    <span className="text-sm font-bold tabular-nums text-white">{formatUSD(review.tasks?.reward_usd ?? 0)}</span>
                  </div>
                </div>

                {review.tasks?.action_url && (
                  <div className="mt-3">
                    <a href={review.tasks.action_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline">
                      View original post <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>
                    </a>
                  </div>
                )}

                <div className="mt-3 rounded-xl bg-background border border-border p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">Submitted Proof</p>
                  {review.proof_url && <a href={review.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline break-all">{review.proof_url}</a>}
                  {review.proof_image_url && <a href={review.proof_image_url} target="_blank" rel="noopener noreferrer" className="block"><Image src={review.proof_image_url} alt="Proof" width={400} height={224} className="mt-1 max-h-56 rounded-lg border border-border object-contain hover:opacity-90 transition-opacity cursor-zoom-in" /></a>}
                  {!review.proof_url && !review.proof_image_url && <p className="text-[13px] text-muted italic">No proof submitted</p>}
                </div>

                {activeTab !== "pending" && review.reviewer_note && (
                  <div className="mt-3 rounded-lg bg-accent-light px-3 py-2">
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Reviewer Note</p>
                    <p className="text-[13px] mt-0.5">{review.reviewer_note}</p>
                  </div>
                )}
                {activeTab !== "pending" && review.reviewed_at && <p className="mt-2 text-[11px] text-muted">Reviewed {timeAgo(review.reviewed_at)}</p>}

                {activeTab === "pending" && (
                  <div className="mt-3 space-y-2 sm:space-y-0 sm:flex sm:items-end sm:gap-2">
                    <div className="flex-1">
                      <input type="text" placeholder="Optional note..." value={notes[review.id] || ""} onChange={(e) => setNotes((prev) => ({ ...prev, [review.id]: e.target.value }))} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleReview(review.id, "approve")} disabled={processing === review.id} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex-1 justify-center sm:flex-none">
                        {processing === review.id ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                        Approve
                      </button>
                      <button onClick={() => handleReview(review.id, "reject")} disabled={processing === review.id} className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex-1 justify-center sm:flex-none">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
