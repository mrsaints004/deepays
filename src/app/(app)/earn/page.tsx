import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { getWeekStart } from "@/lib/utils";
import { redirect } from "next/navigation";
import { EarnContent } from "./earn-content";

export default async function EarnPage() {
  const user = await getSession();
  if (!user) redirect("/");

  const supabase = await createServerClient();
  const weekStart = getWeekStart();

  const [tasksResult, completionsResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .in("status", ["active"])
      .order("created_at", { ascending: false }),
    supabase
      .from("completions")
      .select("task_id, review_status")
      .eq("user_id", user.id)
      .eq("week_start", weekStart),
  ]);

  const tasks = tasksResult.data ?? [];
  const completions = (completionsResult.data ?? []) as Array<{
    task_id: string;
    review_status: "pending_review" | "approved" | "rejected";
  }>;

  // Fetch participant counts for tasks that have a limit
  const tasksWithLimits = tasks.filter((t) => t.max_participants != null);
  const participantCounts: Record<string, number> = {};

  if (tasksWithLimits.length > 0) {
    // Fetch counts for all limited tasks
    for (const task of tasksWithLimits) {
      const { count } = await supabase
        .from("completions")
        .select("id", { count: "exact", head: true })
        .eq("task_id", task.id);
      participantCounts[task.id] = count ?? 0;
    }
  }

  return (
    <EarnContent
      tasks={tasks}
      completions={completions}
      userId={user.id}
      participantCounts={participantCounts}
    />
  );
}
