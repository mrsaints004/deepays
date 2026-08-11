"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, ListTodo, Users, Wallet, ClipboardCheck, LogOut, Menu, X } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/reviews", label: "Reviews", icon: ClipboardCheck },
  { href: "/admin/tasks", label: "Tasks", icon: ListTodo },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet },
];

interface AdminSidebarProps {
  pendingReviewCount?: number;
}

export function AdminSidebar({ pendingReviewCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const nav = (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-white/8 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <span className="text-sm font-bold text-white">D</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            Depay Admin
          </span>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close menu" className="lg:hidden rounded-lg p-1.5 text-white/50 hover:text-white hover:bg-white/8 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav aria-label="Admin navigation" className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          const showBadge = item.href === "/admin/reviews" && pendingReviewCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-[14px] font-medium transition-all relative ${
                active
                  ? "bg-white/12 text-white"
                  : "text-white/50 hover:bg-white/8 hover:text-white/80"
              }`}
            >
              <item.icon size={18} />
              {item.label}
              {showBadge && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                  {pendingReviewCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/8 px-3 py-4">
        <a
          href="/api/admin/logout"
          className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-[14px] font-medium text-white/50 hover:bg-white/8 hover:text-white/80 transition-all"
        >
          <LogOut size={18} />
          Log out
        </a>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-background px-4 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-foreground hover:bg-card-hover transition-colors">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
            <span className="text-xs font-bold text-white">D</span>
          </div>
          <span className="text-[14px] font-semibold tracking-tight">Admin</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-dvh w-64 gradient-dark flex-col lg:flex">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="absolute left-0 top-0 h-dvh w-64 gradient-dark flex flex-col" style={{ animation: "slide-in 0.2s ease-out" }}>
            {nav}
          </aside>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
