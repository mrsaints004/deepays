import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { getWeekStart } from "@/lib/utils";
import { validateOrigin } from "@/lib/csrf";
import { actionLimiter } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await actionLimiter.check(request);
    if (rateLimited) return rateLimited;

    if (!validateOrigin(request)) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { taskId, proofUrl, proofImageUrl } = await request.json();

    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { message: "Missing or invalid taskId" },
        { status: 400 }
      );
    }

    const userId = user.id;
    const supabase = await createServerClient();
    const weekStart = getWeekStart();

    // Check if task exists and is active
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("status", "active")
      .single();

    if (!task) {
      return NextResponse.json(
        { message: "Task not found or no longer active" },
        { status: 404 }
      );
    }

    // Check if task has expired by date even if status not yet updated
    if (task.expires_at && new Date(task.expires_at) < new Date()) {
      return NextResponse.json(
        { message: "This task has expired" },
        { status: 410 }
      );
    }

    // Check participant limit
    if (task.max_participants) {
      const { count } = await supabase
        .from("completions")
        .select("id", { count: "exact", head: true })
        .eq("task_id", taskId);

      if (count != null && count >= task.max_participants) {
        return NextResponse.json(
          { message: "This task has reached its participant limit" },
          { status: 409 }
        );
      }
    }

    // Validate proof based on task category
    const category = task.category || "engagement";
    if (category === "content") {
      if (!proofUrl || typeof proofUrl !== "string") {
        return NextResponse.json(
          { message: "Proof link is required for content tasks" },
          { status: 400 }
        );
      }
      try {
        const url = new URL(proofUrl);
        const allowedHosts = ["twitter.com", "www.twitter.com", "x.com", "www.x.com"];
        if (!allowedHosts.includes(url.hostname)) {
          return NextResponse.json(
            { message: "Proof link must be a twitter.com or x.com URL" },
            { status: 400 }
          );
        }
        if (url.protocol !== "https:") {
          return NextResponse.json(
            { message: "Proof link must use HTTPS" },
            { status: 400 }
          );
        }
        // Validate URL is a real tweet/post path: /<username>/status/<id>
        // This prevents submitting random x.com pages as proof
        const tweetPattern = /^\/[a-zA-Z0-9_]{1,15}\/status\/\d+/;
        if (!tweetPattern.test(url.pathname)) {
          return NextResponse.json(
            { message: "Proof link must be a direct link to a tweet (e.g., https://x.com/user/status/123)" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { message: "Invalid proof URL" },
          { status: 400 }
        );
      }
    } else {
      if (!proofImageUrl || typeof proofImageUrl !== "string") {
        return NextResponse.json(
          { message: "Screenshot proof is required" },
          { status: 400 }
        );
      }
    }

    // Check if already completed — use maybeSingle to avoid error on zero rows
    const { data: existing } = await supabase
      .from("completions")
      .select("id")
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { message: "Task already completed" },
        { status: 409 }
      );
    }

    // Create completion record with proof and pending_review status
    const { error: completionError } = await supabase
      .from("completions")
      .insert({
        user_id: userId,
        task_id: taskId,
        week_start: weekStart,
        proof_url: proofUrl || null,
        proof_image_url: proofImageUrl || null,
        review_status: "pending_review",
      });

    if (completionError) {
      // Handle unique constraint violation (race condition double-submit)
      if (completionError.code === "23505") {
        return NextResponse.json(
          { message: "Task already completed" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { message: "Failed to record completion" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
