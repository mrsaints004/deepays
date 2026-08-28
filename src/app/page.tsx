import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { HomePage } from "@/components/home-page";

export default async function Home() {
  const user = await getSession();

  const supabase = await createServerClient();

  // Fetch active and completed tasks in parallel
  const [activeResult, completedResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, action_url, reward_usd, category, status, max_participants, created_at, expires_at")
      .in("status", ["active"])
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("id, title, description, action_url, reward_usd, category, status, max_participants, created_at, expires_at")
      .in("status", ["expired", "paused"])
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const now = new Date().toISOString();

  // Active tasks: filter out date-expired ones
  const activeTasks = (activeResult.data ?? []).filter(
    (t) => !t.expires_at || t.expires_at > now
  );

  // Tasks that are active but date-expired (status not updated yet) — these are also completed
  const dateExpiredTasks = (activeResult.data ?? []).filter(
    (t) => t.expires_at && t.expires_at <= now
  );

  const completedTasks = [...dateExpiredTasks, ...(completedResult.data ?? [])];

  // Fetch participant counts for completed tasks that have max_participants
  let completedParticipantCounts: Record<string, number> = {};
  const completedTaskIds = completedTasks.map((t) => t.id);
  if (completedTaskIds.length > 0) {
    const { data: counts } = await supabase
      .from("completions")
      .select("task_id")
      .in("task_id", completedTaskIds)
      .neq("review_status", "rejected");

    if (counts) {
      completedParticipantCounts = counts.reduce<Record<string, number>>((acc, row) => {
        acc[row.task_id] = (acc[row.task_id] ?? 0) + 1;
        return acc;
      }, {});
    }
  }

  return (
    <HomePage
      user={user ? { id: user.id, email: user.email ?? null, x_username: user.x_username } : null}
      currentTasks={activeTasks}
      completedTasks={completedTasks}
      completedParticipantCounts={completedParticipantCounts}
    />
  );
}
