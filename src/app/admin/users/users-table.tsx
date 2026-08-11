"use client";

import { Fragment, useState, useMemo } from "react";
import { formatUSD } from "@/lib/utils";
import type { User } from "@/lib/types/database";
import Image from "next/image";
import { Search, ChevronDown, ChevronUp, Wallet, ChevronLeft, ChevronRight } from "lucide-react";

interface UsersTableProps {
  users: (User & { totalEarned: number })[];
}

const PAGE_SIZE = 20;

export function UsersTable({ users }: UsersTableProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => users.filter((u) => u.x_username.toLowerCase().includes(search.toLowerCase())), [users, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const handleSearch = (value: string) => { setSearch(value); setPage(0); };

  return (
    <>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input type="text" placeholder="Search by username..." value={search} onChange={(e) => handleSearch(e.target.value)} className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 shadow-soft-sm" />
      </div>

      <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-soft-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">Wallet</th>
              <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">Total Earned</th>
              <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">Joined</th>
              <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider w-10"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((user, i) => (
              <Fragment key={user.id}>
                <tr className={`border-b border-border last:border-0 transition-colors cursor-pointer hover:bg-accent-light/40 ${i % 2 === 0 ? "bg-card" : "bg-background"}`} onClick={() => setExpandedId(expandedId === user.id ? null : user.id)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.x_avatar_url ? <Image src={user.x_avatar_url} alt={user.x_username} width={32} height={32} className="h-8 w-8 rounded-full" /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-bold text-white">{user.x_username.charAt(0).toUpperCase()}</div>}
                      <span className="text-[14px] font-semibold">@{user.x_username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{user.wallet_address ? <div className="flex items-center gap-1.5"><div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10"><Wallet size={12} className="text-success" /></div><span className="text-[12px] font-mono text-muted">{user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}</span></div> : <span className="text-[12px] text-muted">Not connected</span>}</td>
                  <td className="px-4 py-3 text-[14px] font-bold tabular-nums text-accent">{formatUSD(user.totalEarned)}</td>
                  <td className="px-4 py-3 text-[12px] text-muted">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{expandedId === user.id ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}</td>
                </tr>
                {expandedId === user.id && (
                  <tr className="bg-accent-light/20">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="grid grid-cols-2 gap-4 text-[13px] lg:grid-cols-4">
                        <div className="rounded-lg bg-card border border-border p-3"><p className="text-muted text-[11px] uppercase tracking-wider font-semibold">User ID</p><p className="font-mono text-[12px] mt-1">{user.id}</p></div>
                        <div className="rounded-lg bg-card border border-border p-3"><p className="text-muted text-[11px] uppercase tracking-wider font-semibold">X ID</p><p className="font-mono text-[12px] mt-1">{user.x_id}</p></div>
                        <div className="rounded-lg bg-card border border-border p-3"><p className="text-muted text-[11px] uppercase tracking-wider font-semibold">Last Login</p><p className="mt-1 text-[12px]">{new Date(user.last_login).toLocaleString()}</p></div>
                        <div className="rounded-lg bg-card border border-border p-3"><p className="text-muted text-[11px] uppercase tracking-wider font-semibold">Full Wallet</p><p className="font-mono text-[12px] mt-1 break-all">{user.wallet_address ?? "None"}</p></div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-[13px] text-muted">{search ? "No users found" : "No users yet"}</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[12px] text-muted">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="rounded-lg p-2 text-muted hover:bg-card-hover hover:text-foreground transition-colors disabled:opacity-30"><ChevronLeft size={16} /></button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setPage(i)} className={`rounded-lg px-3 py-1 text-[13px] font-medium transition-colors ${page === i ? "bg-foreground text-white" : "text-muted hover:bg-card-hover"}`}>{i + 1}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded-lg p-2 text-muted hover:bg-card-hover hover:text-foreground transition-colors disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </>
  );
}
