"use client";

import { useState } from "react";
import Image from "next/image";

const sizes = {
  sm: { px: 32, cls: "h-8 w-8", text: "text-xs", ring: "ring-2" },
  md: { px: 48, cls: "h-12 w-12", text: "text-base", ring: "ring-2" },
  lg: { px: 80, cls: "h-20 w-20", text: "text-2xl", ring: "ring-4" },
} as const;

interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}

export function UserAvatar({ username, avatarUrl, size = "sm", className = "" }: UserAvatarProps) {
  const [error, setError] = useState(false);
  const s = sizes[size];
  const initial = username?.charAt(0)?.toUpperCase() ?? "?";
  const diceBearUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}`;

  if (avatarUrl && !error) {
    return (
      <Image
        src={avatarUrl}
        alt={username}
        width={s.px}
        height={s.px}
        className={`rounded-full ${s.ring} ring-border ${className}`}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <img
      src={diceBearUrl}
      alt={initial}
      width={s.px}
      height={s.px}
      className={`rounded-full ${s.ring} ring-border ${className}`}
      onError={(e) => {
        // Final fallback: replace with a div-like colored background
        const target = e.currentTarget;
        target.style.display = "none";
        const div = document.createElement("div");
        div.className = `flex items-center justify-center rounded-full bg-foreground font-semibold text-white ${s.cls} ${s.text} ${className}`;
        div.textContent = initial;
        target.parentNode?.insertBefore(div, target);
      }}
    />
  );
}
