import Image from "next/image";
import Link from "next/link";
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
          {user.x_avatar_url ? (
            <Image src={user.x_avatar_url} alt={user.x_username} width={32} height={32} className="rounded-full ring-2 ring-border" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-white">
              {user.x_username.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
