import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminWalletProvider } from "@/components/admin-wallet-provider";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await verifyAdmin();

  if (!isAdmin) {
    redirect("/admin-login");
  }

  // Fetch pending review count for sidebar badge
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("completions")
    .select("id", { count: "exact", head: true })
    .eq("review_status", "pending_review");

  return (
    <div className="min-h-dvh bg-background">
      <AdminSidebar pendingReviewCount={count ?? 0} />
      <AdminWalletProvider>
        <main className="p-4 pt-4 lg:pl-72 lg:pr-8 lg:py-8">{children}</main>
      </AdminWalletProvider>
    </div>
  );
}
