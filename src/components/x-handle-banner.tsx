"use client";

import { useState } from "react";

interface XHandleBannerProps {
  currentUsername: string;
  email: string | null;
}

/**
 * Shows a banner prompting Google OAuth users to set their real X handle.
 * Detects "missing" handle by checking if current username matches the
 * email prefix or Google display name pattern (no underscore, not a
 * valid-looking X handle).
 */
export function XHandleBanner({ currentUsername, email }: XHandleBannerProps) {
  const [xUsername, setXUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [saved, setSaved] = useState(false);

  // Detect if the username looks like it was auto-generated from Google OAuth
  const emailPrefix = email?.split("@")[0] ?? "";
  const needsHandle =
    !currentUsername ||
    currentUsername === emailPrefix ||
    currentUsername === "user" ||
    // Google names with spaces get joined — detect patterns like "JohnDoe" or full names
    (currentUsername.length > 15) ||
    // Contains spaces (shouldn't for X handles)
    currentUsername.includes(" ");

  if (!needsHandle || dismissed || saved) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = xUsername.replace(/^@/, "").trim();
    if (!clean) {
      setError("Please enter your X username");
      return;
    }
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(clean)) {
      setError("Invalid X username. Use 1-15 characters: letters, numbers, underscores.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x_username: clean }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update");
        setLoading(false);
        return;
      }

      setSaved(true);
      // Reload to reflect the updated username across the app
      setTimeout(() => window.location.reload(), 500);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/5 p-4 animate-in">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-warning/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-foreground">Set your X (Twitter) handle</p>
          <p className="mt-0.5 text-[12px] text-muted">
            Your X handle is required to submit task proofs and earn rewards. Please enter your real X username below.
          </p>

          {saved ? (
            <div className="mt-3 flex items-center gap-2 text-[13px] font-medium text-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Saved! Refreshing...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="@yourhandle"
                value={xUsername}
                onChange={(e) => { setXUsername(e.target.value); setError(""); }}
                className="w-full max-w-[200px] rounded-lg border border-border bg-white px-3 py-2 text-[13px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="text-[12px] font-medium text-muted hover:text-foreground transition-colors"
              >
                Later
              </button>
            </form>
          )}

          {error && <p className="mt-2 text-[12px] text-danger font-medium">{error}</p>}
        </div>
      </div>
    </div>
  );
}
