import { createAdminClient } from "@/lib/supabase/server";
import { ReviewsManager } from "./reviews-manager";

const PAGE_SIZE = 50;

export default async function ReviewsPage() {
  const supabase = createAdminClient();

  // Fetch reviews with pagination — pending gets all (usually small), others capped
  const [pendingResult, approvedResult, rejectedResult] = await Promise.all([
    supabase
      .from("completions")
      .select(
        "*, users(id, x_username, email, x_avatar_url), tasks(id, title, reward_usd, category, action_url)"
      )
      .eq("review_status", "pending_review")
      .order("completed_at", { ascending: false })
      .limit(PAGE_SIZE),
    supabase
      .from("completions")
      .select(
        "*, users(id, x_username, email, x_avatar_url), tasks(id, title, reward_usd, category, action_url)"
      )
      .eq("review_status", "approved")
      .order("completed_at", { ascending: false })
      .limit(PAGE_SIZE),
    supabase
      .from("completions")
      .select(
        "*, users(id, x_username, email, x_avatar_url), tasks(id, title, reward_usd, category, action_url)"
      )
      .eq("review_status", "rejected")
      .order("completed_at", { ascending: false })
      .limit(PAGE_SIZE),
  ]);

  type ReviewRow = {
    id: string;
    user_id: string;
    task_id: string;
    completed_at: string;
    proof_url: string | null;
    proof_image_url: string | null;
    review_status: string;
    reviewer_note: string | null;
    reviewed_at: string | null;
    users: { id: string; x_username: string; email: string | null; x_avatar_url: string | null } | null;
    tasks: {
      id: string;
      title: string;
      reward_usd: number;
      category: string;
      action_url: string;
    } | null;
  };

  const pendingReviews = (pendingResult.data ?? []) as ReviewRow[];
  const approvedReviews = (approvedResult.data ?? []) as ReviewRow[];
  const rejectedReviews = (rejectedResult.data ?? []) as ReviewRow[];

  return (
    <div className="animate-in">
      <ReviewsManager
        pendingReviews={pendingReviews}
        approvedReviews={approvedReviews}
        rejectedReviews={rejectedReviews}
      />
    </div>
  );
}
