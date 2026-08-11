"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { formatUSD, cn } from "@/lib/utils";
import { useToast } from "@/components/toast";
import type { Task } from "@/lib/types/database";

interface ProofData {
  proofUrl?: string;
  proofImageUrl?: string;
}

interface TaskCardProps {
  task: Task;
  isCompleted: boolean;
  reviewStatus?: "pending_review" | "approved" | "rejected";
  onComplete: (taskId: string, proof: ProofData) => Promise<void>;
  participantCount?: number;
}

const categoryColors: Record<string, { dot: string; text: string }> = {
  engagement: { dot: "bg-blue-500", text: "text-blue-600" },
  follow: { dot: "bg-purple-500", text: "text-purple-600" },
  content: { dot: "bg-amber-500", text: "text-amber-600" },
  other: { dot: "bg-muted", text: "text-muted" },
};

const reviewBadges: Record<string, { className: string; label: string; border: string }> = {
  pending_review: { className: "bg-warning/10 text-warning", label: "Pending Review", border: "border-l-warning" },
  approved: { className: "bg-success/10 text-success", label: "Approved", border: "border-l-success" },
  rejected: { className: "bg-danger/10 text-danger", label: "Rejected", border: "border-l-danger" },
};

export function TaskCard({ task, isCompleted, reviewStatus, onComplete, participantCount }: TaskCardProps) {
  const { toast } = useToast();
  const [visited, setVisited] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(isCompleted);
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExpired = task.status === "expired";
  const category = task.category || "engagement";
  const isContentTask = category === "content";
  const isFull = task.max_participants != null && participantCount != null && participantCount >= task.max_participants;

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setUploadedImageUrl(data.url);
    } catch { toast("Upload failed. Please try again.", "error"); } finally { setUploading(false); }
  }

  async function handleSubmit() {
    setCompleting(true);
    try {
      const proof: ProofData = isContentTask ? { proofUrl } : { proofImageUrl: uploadedImageUrl };
      await onComplete(task.id, proof);
      setDone(true);
    } catch { toast("Submission failed. Please try again.", "error"); } finally { setCompleting(false); }
  }

  const badge = reviewStatus ? reviewBadges[reviewStatus] : null;
  const catColor = categoryColors[category] || categoryColors.other;

  return (
    <div
      className={cn(
        "group relative rounded-2xl border transition-all duration-300",
        done && badge
          ? `border-border bg-card shadow-soft-sm border-l-4 ${badge.border}`
          : done
          ? "border-border bg-card/50 shadow-soft-sm border-l-4 border-l-success"
          : isExpired
          ? "border-border bg-card/30 opacity-60"
          : isFull
          ? "border-border bg-card/30 opacity-60"
          : "border-border bg-card shadow-soft-sm hover:shadow-soft-md hover:-translate-y-0.5"
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn("text-[15px] font-semibold leading-snug", done && "text-muted line-through")}>
                {task.title}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider">
                <span className={`h-1.5 w-1.5 rounded-full ${catColor.dot}`} />
                <span className={catColor.text}>{category}</span>
              </span>
              {badge && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              )}
              {task.max_participants != null && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${isFull && !done ? "bg-danger/10 text-danger" : "bg-card text-muted"}`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  {participantCount ?? 0}/{task.max_participants}
                </span>
              )}
              {isFull && !done && (
                <span className="inline-flex rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">Full</span>
              )}
              {isExpired && !done && (
                <span className="inline-flex rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-muted">Ended</span>
              )}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{task.description}</p>
          </div>

          {/* Reward badge */}
          <div className={cn("flex-shrink-0 rounded-xl px-3 py-1.5 text-center", done ? "bg-card border border-border" : "bg-accent")}>
            <span className={cn("text-sm font-bold tabular-nums", done ? "text-muted" : "text-white")}>
              {formatUSD(task.reward_usd)}
            </span>
          </div>
        </div>

        {/* Actions */}
        {!done && !isExpired && !isFull && (
          <div className="mt-3 space-y-3">
            <a
              href={task.action_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setVisited(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-foreground bg-foreground px-4 py-2 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Go to X
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>
            </a>

            {visited && (
              <div className="rounded-xl border border-border bg-background p-3 animate-slide-up">
                {isContentTask ? (
                  <div className="space-y-2">
                    <label className="text-[12px] font-medium text-muted">Paste your retweet or comment link</label>
                    <input
                      type="url"
                      placeholder="https://x.com/..."
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={completing || !proofUrl}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                    >
                      {completing ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      Submit Proof
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[12px] font-medium text-muted">Upload a screenshot as proof</label>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(file); }} />
                    {!uploadedImageUrl ? (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-card px-4 py-3 text-[13px] font-semibold text-muted transition-all hover:border-foreground hover:text-foreground active:scale-[0.98] disabled:opacity-50 w-full justify-center"
                      >
                        {uploading ? (
                          <><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> Uploading...</>
                        ) : (
                          <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg> Choose Screenshot</>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <Image src={uploadedImageUrl} alt="Proof screenshot" width={300} height={128} className="max-h-32 rounded-lg border border-border object-contain" />
                        <button
                          onClick={handleSubmit}
                          disabled={completing}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                        >
                          {completing ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                          Submit Proof
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
