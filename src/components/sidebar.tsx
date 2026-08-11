"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types/database";

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-white lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
          <span className="text-sm font-bold text-white tracking-tight">D</span>
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Depay</span>
      </div>

      {/* Nav links */}
      <nav aria-label="Main navigation" className="flex-1 px-3 pt-4 space-y-1">
        <Link
          href="/earn"
          aria-current={pathname === "/earn" ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all",
            pathname === "/earn"
              ? "bg-accent-light text-accent font-semibold"
              : "text-muted hover:bg-card-hover hover:text-foreground"
          )}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === "/earn" ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Earn
        </Link>

        <Link
          href="/profile"
          aria-current={pathname === "/profile" ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all",
            pathname === "/profile"
              ? "bg-accent-light text-accent font-semibold"
              : "text-muted hover:bg-card-hover hover:text-foreground"
          )}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === "/profile" ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profile
        </Link>
      </nav>

      {/* User info + logout */}
      <div className="mt-auto border-t border-border p-4">
        <div className="flex items-center gap-3">
          {user.x_avatar_url ? (
            <Image src={user.x_avatar_url} alt={user.x_username} width={32} height={32} className="rounded-full ring-2 ring-border" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-white">
              {user.x_username.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-semibold">@{user.x_username}</p>
          </div>
        </div>
        <a
          href="/api/auth/logout"
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-border px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-card-hover hover:text-foreground"
        >
          Log out
        </a>
      </div>
    </aside>
  );
}
