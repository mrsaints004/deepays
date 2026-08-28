import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { Sidebar } from "@/components/sidebar";
import { UserWalletProvider } from "@/components/user-wallet-provider";
import { XHandleBanner } from "@/components/x-handle-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) redirect("/");

  return (
    <UserWalletProvider>
      <div className="flex min-h-dvh flex-col">
        {/* Desktop sidebar */}
        <Sidebar user={user} />

        {/* Mobile top bar — hidden on desktop */}
        <div className="lg:hidden">
          <TopBar user={user} />
        </div>

        {/* Main content — offset by sidebar width on desktop */}
        <div className="flex-1 lg:pl-64">
          <main id="main-content" className="mx-auto w-full max-w-3xl px-5 pb-24 pt-6 lg:pb-8">
            <XHandleBanner currentUsername={user.x_username} email={user.email ?? null} />
            {children}
          </main>
        </div>

        {/* Mobile bottom nav — hidden on desktop */}
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </UserWalletProvider>
  );
}
