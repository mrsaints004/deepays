"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin");
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || "Invalid password");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm animate-in">
        <div className="flex flex-col items-center">
          <Image src="/Deepay_logo_option_1_ransparent.png" alt="Deepays" width={48} height={48} className="rounded-xl" />
          <h1 className="mt-4 text-lg font-bold">Admin Access</h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              aria-label="Admin password"
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] outline-none transition-colors focus:border-foreground"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-[13px] text-danger">{error}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-xl bg-foreground px-4 py-3 text-[14px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
