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

  // Fetch participant counts for both active and completed tasks
  const allTaskIds = [...activeTasks, ...completedTasks].map((t) => t.id);
  let activeParticipantCounts: Record<string, number> = {};
  let completedParticipantCounts: Record<string, number> = {};

  if (allTaskIds.length > 0) {
    const { data: counts } = await supabase
      .from("completions")
      .select("task_id")
      .in("task_id", allTaskIds);

    if (counts) {
      const allCounts = counts.reduce<Record<string, number>>((acc, row) => {
        acc[row.task_id] = (acc[row.task_id] ?? 0) + 1;
        return acc;
      }, {});

      const activeIds = new Set(activeTasks.map((t) => t.id));
      const completedIds = new Set(completedTasks.map((t) => t.id));

      for (const [taskId, count] of Object.entries(allCounts)) {
        if (activeIds.has(taskId)) activeParticipantCounts[taskId] = count;
        if (completedIds.has(taskId)) completedParticipantCounts[taskId] = count;
      }
    }
  }

  return (
    <HomePage
      user={user ? { id: user.id, email: user.email ?? null, x_username: user.x_username } : null}
      currentTasks={activeTasks}
      activeParticipantCounts={activeParticipantCounts}
      completedTasks={completedTasks}
      completedParticipantCounts={completedParticipantCounts}
    />
  );
}
