import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { validateOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Validate required fields
  if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!body.action_url || typeof body.action_url !== "string") {
    return NextResponse.json({ error: "Action URL is required" }, { status: 400 });
  }
  if (body.reward_usd == null || isNaN(body.reward_usd) || body.reward_usd <= 0 || !Number.isFinite(body.reward_usd)) {
    return NextResponse.json({ error: "Reward must be a positive number" }, { status: 400 });
  }
  if (body.reward_usd > 100000) {
    return NextResponse.json({ error: "Reward cannot exceed $100,000" }, { status: 400 });
  }

  // Validate action URL format
  try {
    new URL(body.action_url);
  } catch {
    return NextResponse.json({ error: "Invalid action URL" }, { status: 400 });
  }

  // Validate max_participants if provided
  if (body.max_participants != null && body.max_participants !== "") {
    const mp = parseInt(body.max_participants, 10);
    if (isNaN(mp) || mp < 1 || mp > 100000) {
      return NextResponse.json({ error: "Max participants must be between 1 and 100,000" }, { status: 400 });
    }
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: body.title.trim(),
      description: (body.description || "").trim(),
      action_url: body.action_url.trim(),
      reward_usd: body.reward_usd,
      status: "active",
      category: ["engagement", "follow", "content", "other"].includes(body.category) ? body.category : "engagement",
      expires_at: body.expires_at
        ? new Date(body.expires_at).toISOString()
        : null,
      max_participants: body.max_participants ? Math.min(parseInt(body.max_participants, 10), 100000) : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    action: "task_created",
    target_type: "task",
    target_id: data.id,
    details: { title: data.title, reward_usd: data.reward_usd },
  });

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  // Validate reward if provided
  if (body.reward_usd !== undefined && (isNaN(body.reward_usd) || body.reward_usd <= 0 || !Number.isFinite(body.reward_usd))) {
    return NextResponse.json({ error: "Reward must be a positive number" }, { status: 400 });
  }
  if (body.reward_usd !== undefined && body.reward_usd > 100000) {
    return NextResponse.json({ error: "Reward cannot exceed $100,000" }, { status: 400 });
  }

  // Validate status if provided
  if (body.status !== undefined && !["active", "paused", "expired"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = String(body.title).trim();
  if (body.description !== undefined) updateData.description = String(body.description).trim();
  if (body.action_url !== undefined) {
    try { new URL(body.action_url); } catch {
      return NextResponse.json({ error: "Invalid action URL" }, { status: 400 });
    }
    updateData.action_url = body.action_url;
  }
  if (body.reward_usd !== undefined) updateData.reward_usd = body.reward_usd;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.category !== undefined) {
    if (!["engagement", "follow", "content", "other"].includes(body.category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    updateData.category = body.category;
  }
  if (body.expires_at !== undefined) {
    updateData.expires_at = body.expires_at
      ? new Date(body.expires_at).toISOString()
      : null;
  }
  if (body.max_participants !== undefined) {
    if (body.max_participants != null && body.max_participants !== "" && body.max_participants !== null) {
      const mp = parseInt(body.max_participants, 10);
      if (isNaN(mp) || mp < 1 || mp > 100000) {
        return NextResponse.json({ error: "Max participants must be between 1 and 100,000" }, { status: 400 });
      }
      updateData.max_participants = mp;
    } else {
      updateData.max_participants = null;
    }
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    action: "task_updated",
    target_type: "task",
    target_id: body.id,
    details: updateData,
  });

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    action: "task_deleted",
    target_type: "task",
    target_id: id,
  });

  return NextResponse.json({ success: true });
}
