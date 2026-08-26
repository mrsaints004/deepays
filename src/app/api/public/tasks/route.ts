import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, description, action_url, reward_usd, category, status, max_participants, created_at, expires_at")
    .in("status", ["active"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: "Failed to fetch tasks" }, { status: 500 });
  }

  return NextResponse.json({ tasks: tasks ?? [] });
}
