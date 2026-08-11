import { createAdminClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/types/database";
import { TasksManager } from "./tasks-manager";

const PAGE_SIZE = 50;

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createAdminClient();

  const { count: totalCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true });

  const { data } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const tasks = (data ?? []) as Task[];
  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="animate-in">
      <TasksManager initialTasks={tasks} />
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Tasks pagination">
          {page > 1 && (
            <a
              href={`/admin/tasks?page=${page - 1}`}
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
              href={`/admin/tasks?page=${page + 1}`}
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
