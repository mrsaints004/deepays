"use client";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      }}
      className={className}
    >
      Log out
    </button>
  );
}
