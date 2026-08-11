import { createAdminClient } from "@/lib/supabase/server";
import type { User } from "@/lib/types/database";
import { UsersTable } from "./users-table";

const PAGE_SIZE = 50;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createAdminClient();

  // Get total count
  const { count: totalCount } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true });

  const { data: users } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // Fetch total earned per user (for visible users only)
  const userIds = (users ?? []).map((u) => u.id);
  const { data: payouts } = userIds.length > 0
    ? await supabase
        .from("weekly_payouts")
        .select("user_id, total_usd")
        .in("user_id", userIds)
    : { data: [] };

  const earningsByUser = new Map<string, number>();
  for (const p of payouts ?? []) {
    earningsByUser.set(
      p.user_id,
      (earningsByUser.get(p.user_id) ?? 0) + p.total_usd
    );
  }

  const usersWithEarnings = ((users ?? []) as User[]).map((u) => ({
    ...u,
    totalEarned: earningsByUser.get(u.id) ?? 0,
  }));

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="animate-in">
      <h1 className="text-xl font-bold tracking-tight mb-6">
        Users ({total})
      </h1>
      <UsersTable users={usersWithEarnings} />
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Users pagination">
          {page > 1 && (
            <a
              href={`/admin/users?page=${page - 1}`}
              className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-card-hover transition-colors"
            >
              Previous
            </a>
          )}
          <span className="text-[13px] text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/admin/users?page=${page + 1}`}
              className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-card-hover transition-colors"
            >
              Next
            </a>
          )}
        </nav>
      )}
    </div>
  );
}
