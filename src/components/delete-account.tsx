"use client";

import { useState } from "react";

export function DeleteAccount() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (confirmation !== "DELETE MY ACCOUNT") {
      setError("Please type exactly: DELETE MY ACCOUNT");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete account");
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      const res = await fetch("/api/user/account");
      if (!res.ok) return;
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "depay-data-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail
    }
  }

  if (!showConfirm) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft-sm">
        <h3 className="text-[14px] font-semibold text-danger">Danger Zone</h3>
        <p className="mt-1 text-[12px] text-muted">
          Delete your account and all associated data. This cannot be undone.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleExport}
            className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-card-hover"
            aria-label="Download a copy of your data"
          >
            Export my data
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-1.5 text-[12px] font-medium text-danger transition-colors hover:bg-danger/10"
            aria-label="Delete your account permanently"
          >
            Delete account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
      <h3 className="text-[14px] font-semibold text-danger">Confirm Account Deletion</h3>
      <p className="mt-1 text-[12px] text-muted">
        Type <strong>DELETE MY ACCOUNT</strong> to confirm. All your data, completions, and payout history will be permanently removed.
      </p>
      <input
        type="text"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder="DELETE MY ACCOUNT"
        className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-danger/30"
        aria-label="Type DELETE MY ACCOUNT to confirm deletion"
      />
      {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => {
            setShowConfirm(false);
            setConfirmation("");
            setError("");
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-card-hover"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={loading || confirmation !== "DELETE MY ACCOUNT"}
          className="rounded-lg bg-danger px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Deleting..." : "Permanently delete"}
        </button>
      </div>
    </div>
  );
}
