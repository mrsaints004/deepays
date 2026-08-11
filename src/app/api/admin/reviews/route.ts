import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getWeekStart } from "@/lib/utils";
import { verifyAdmin } from "@/lib/admin-auth";
import { validateOrigin } from "@/lib/csrf";
import { notifyTaskApproved, notifyTaskRejected } from "@/lib/email";

export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("completions")
      .select("*, users(id, x_username, email, x_avatar_url), tasks(id, title, reward_usd, category, action_url)")
      .eq("review_status", "pending_review")
      .order("completed_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to fetch reviews:", error);
      return NextResponse.json(
        { message: "Failed to fetch reviews" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reviews: data });
  } catch (err) {
    console.error("Reviews GET error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyAdmin())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { completionId, action, note } = await request.json();

    if (!completionId || typeof completionId !== "string") {
      return NextResponse.json(
        { message: "Missing or invalid completionId" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { message: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get the completion with task info and user email — only if it's still pending_review
    const { data: completion } = await supabase
      .from("completions")
      .select("*, tasks(reward_usd, title), users(email)")
      .eq("id", completionId)
      .eq("review_status", "pending_review")
      .single();

    if (!completion) {
      return NextResponse.json(
        { message: "Completion not found or already reviewed" },
        { status: 404 }
      );
    }

    const reviewStatus = action === "approve" ? "approved" : "rejected";

    // Update completion review status
    const { error: updateError } = await supabase
      .from("completions")
      .update({
        review_status: reviewStatus,
        reviewed_at: new Date().toISOString(),
        reviewer_note: note && typeof note === "string" ? note.slice(0, 500) : null,
      })
      .eq("id", completionId)
      .eq("review_status", "pending_review");

    if (updateError) {
      return NextResponse.json(
        { message: "Failed to update review" },
        { status: 500 }
      );
    }

    // On approve, upsert weekly_payouts
    if (action === "approve") {
      const task = completion.tasks as { reward_usd: number } | null;
      const rewardUsd = task?.reward_usd ?? 0;

      if (rewardUsd <= 0) {
        return NextResponse.json({ success: true });
      }

      const weekStart = completion.week_start || getWeekStart();

      // Use optimistic locking with retry loop to prevent lost updates
      const MAX_RETRIES = 3;
      let retries = 0;
      let success = false;

      while (retries < MAX_RETRIES && !success) {
        const { data: payout } = await supabase
          .from("weekly_payouts")
          .select("*")
          .eq("user_id", completion.user_id)
          .eq("week_start", weekStart)
          .maybeSingle();

        if (payout) {
          const { error: updatePayoutError } = await supabase
            .from("weekly_payouts")
            .update({ total_usd: payout.total_usd + rewardUsd })
            .eq("id", payout.id)
            .eq("total_usd", payout.total_usd); // optimistic lock

          if (!updatePayoutError) {
            success = true;
          } else {
            retries++;
            // Brief delay before retry
            await new Promise((r) => setTimeout(r, 50 * retries));
          }
        } else {
          const { error: insertError } = await supabase
            .from("weekly_payouts")
            .insert({
              user_id: completion.user_id,
              week_start: weekStart,
              total_usd: rewardUsd,
              status: "pending",
            });

          if (!insertError) {
            success = true;
          } else if (insertError.code === "23505") {
            // Unique constraint — another request created it first, retry to update
            retries++;
          } else {
            break; // Unexpected error
          }
        }
      }

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "completion_approved",
        target_type: "completion",
        target_id: completionId,
        details: { user_id: completion.user_id, reward_usd: rewardUsd, week_start: weekStart },
      });

      // Email notification
      const userEmail = (completion.users as { email: string | null } | null)?.email;
      const taskTitle = (completion.tasks as { reward_usd: number; title: string } | null)?.title ?? "Task";
      if (userEmail) {
        notifyTaskApproved(userEmail, taskTitle, rewardUsd).catch(() => {});
      }
    }

    // Audit log and notification for rejections
    if (action === "reject") {
      await supabase.from("audit_logs").insert({
        action: "completion_rejected",
        target_type: "completion",
        target_id: completionId,
        details: { user_id: completion.user_id },
      });

      const userEmail = (completion.users as { email: string | null } | null)?.email;
      const taskTitle = (completion.tasks as { reward_usd: number; title: string } | null)?.title ?? "Task";
      const reviewNote = note && typeof note === "string" ? note.slice(0, 500) : undefined;
      if (userEmail) {
        notifyTaskRejected(userEmail, taskTitle, reviewNote).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
