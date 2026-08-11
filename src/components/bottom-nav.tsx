"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-6">
        <Link
          href="/earn"
          aria-current={pathname === "/earn" ? "page" : undefined}
          className={cn(
            "relative flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-all duration-200",
            pathname === "/earn" ? "text-accent" : "text-muted hover:text-foreground"
          )}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === "/earn" ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span className={cn("text-[11px] tracking-wide", pathname === "/earn" ? "font-semibold" : "font-medium")}>Earn</span>
          {pathname === "/earn" && <span className="absolute -bottom-1 h-1 w-6 rounded-full bg-accent" />}
        </Link>

        <Link
          href="/profile"
          aria-current={pathname === "/profile" ? "page" : undefined}
          className={cn(
            "relative flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-all duration-200",
            pathname === "/profile" ? "text-accent" : "text-muted hover:text-foreground"
          )}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === "/profile" ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className={cn("text-[11px] tracking-wide", pathname === "/profile" ? "font-semibold" : "font-medium")}>Profile</span>
          {pathname === "/profile" && <span className="absolute -bottom-1 h-1 w-6 rounded-full bg-accent" />}
        </Link>
      </div>
    </nav>
  );
}
