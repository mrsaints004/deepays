import Link from "next/link";
import Image from "next/image";
import { UserAvatar } from "@/components/user-avatar";
import type { User } from "@/lib/types/database";

export function TopBar({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50">
      <div className="mx-auto flex h-14 items-center justify-between px-5">
        <Link href="/earn" className="flex items-center gap-2.5">
          <Image src="/Deepay_logo_option_1_ransparent.png" alt="Deepays" width={32} height={32} className="rounded-lg" />
          <span className="text-[15px] font-semibold tracking-tight">Deepays</span>
        </Link>

        <Link href="/profile" aria-label="Your profile" className="relative">
          <UserAvatar username={user.x_username} avatarUrl={user.x_avatar_url} size="sm" />
        </Link>
      </div>
    </header>
  );
}
