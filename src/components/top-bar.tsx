import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import type { User } from "@/lib/types/database";

export function TopBar({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="mx-auto flex h-14 items-center justify-between px-5">
        <Link href="/earn" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
            <span className="text-sm font-bold text-white tracking-tight">D</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Depay</span>
        </Link>

        <Link href="/profile" aria-label="Your profile" className="relative">
          <UserAvatar username={user.x_username} avatarUrl={user.x_avatar_url} size="sm" />
        </Link>
      </div>
    </header>
  );
}
