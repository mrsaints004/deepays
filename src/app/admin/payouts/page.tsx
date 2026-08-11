import { createAdminClient } from "@/lib/supabase/server";
import { getWeekStart } from "@/lib/utils";
import type { WeeklyPayout } from "@/lib/types/database";
import { PayoutsManager } from "./payouts-manager";

export default async function AdminPayoutsPage() {
  const supabase = createAdminClient();
  const currentWeek = getWeekStart();

  // Get distinct weeks
  const { data: weeksRaw } = await supabase
    .from("weekly_payouts")
    .select("week_start")
    .order("week_start", { ascending: false });

  const weeks = [...new Set((weeksRaw ?? []).map((w) => w.week_start))];
  if (!weeks.includes(currentWeek)) {
    weeks.unshift(currentWeek);
  }

  // Get payouts with user info for the current week
  const { data: payouts } = await supabase
    .from("weekly_payouts")
    .select("*, users(x_username, wallet_address)")
    .eq("week_start", currentWeek)
    .order("total_usd", { ascending: false });

  const payoutsData = (payouts ?? []) as (WeeklyPayout & {
    users: { x_username: string; wallet_address: string | null } | null;
  })[];

  return (
    <div className="animate-in">
      <PayoutsManager
        initialPayouts={payoutsData}
        weeks={weeks}
        initialWeek={currentWeek}
      />
    </div>
  );
}
