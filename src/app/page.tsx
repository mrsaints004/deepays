import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { HomePage } from "@/components/home-page";

export default async function Home() {
  const user = await getSession();

  const supabase = await createServerClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, description, action_url, reward_usd, category, status, max_participants, created_at, expires_at")
    .in("status", ["active"])
    .order("created_at", { ascending: false });

  return (
    <HomePage
      user={user ? { id: user.id, email: user.email ?? null, x_username: user.x_username } : null}
      currentTasks={tasks ?? []}
    />
  );
}
