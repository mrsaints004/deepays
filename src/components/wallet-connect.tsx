"use client";

import { useState } from "react";

interface WalletConnectProps {
  currentAddress: string | null;
}

export function WalletConnect({ currentAddress }: WalletConnectProps) {
  const [address, setAddress] = useState(currentAddress);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"idle" | "paste" | "connecting">("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveAddress(addr: string) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/wallet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save wallet");
      }
      const data = await res.json();
      setAddress(data.wallet_address);
      setMode("idle");
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save wallet");
    } finally {
      setSaving(false);
    }
  }

  async function connectBrowserWallet() {
    setError("");
    setMode("connecting");
    try {
      const ethereum = (window as unknown as Record<string, unknown>).ethereum as {
        request: (args: { method: string }) => Promise<string[]>;
      } | undefined;
      if (!ethereum) {
        throw new Error("No wallet detected. Install MetaMask or paste your address.");
      }
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      if (accounts[0]) {
        await saveAddress(accounts[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
      setMode("idle");
    }
  }

  async function disconnect() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/wallet", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setAddress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setSaving(false);
    }
  }

  function handlePasteSubmit() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      setError("Invalid Ethereum address");
      return;
    }
    saveAddress(trimmed);
  }

  if (address) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium text-muted uppercase tracking-wider">
              Payout Wallet (Base)
            </p>
            <p className="mt-1 text-[14px] font-mono font-medium">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>
          <button
            onClick={disconnect}
            disabled={saving}
            className="rounded-xl border border-border px-4 py-2 text-[13px] font-semibold text-muted hover:text-danger hover:border-danger/30 transition-colors disabled:opacity-50"
          >
            {saving ? "..." : "Disconnect"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-[12px] text-danger">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <p className="text-[12px] font-medium text-muted uppercase tracking-wider mb-3">
        Connect Wallet (Base Network)
      </p>

      {mode === "idle" && (
        <div className="flex gap-2">
          <button
            onClick={connectBrowserWallet}
            className="flex-1 rounded-xl bg-foreground px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Connect Wallet
          </button>
          <button
            onClick={() => setMode("paste")}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-[13px] font-semibold text-foreground hover:bg-card active:scale-[0.98] transition-all"
          >
            Paste Address
          </button>
        </div>
      )}

      {mode === "paste" && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="0x..."
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] font-mono outline-none focus:border-foreground"
          />
          <div className="flex gap-2">
            <button
              onClick={handlePasteSubmit}
              disabled={saving || !input.trim()}
              className="rounded-xl bg-foreground px-5 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => { setMode("idle"); setInput(""); setError(""); }}
              className="rounded-xl border border-border px-5 py-2 text-[13px] font-semibold text-muted hover:bg-card"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "connecting" && (
        <div className="flex items-center gap-2 py-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <span className="text-[13px] text-muted">Connecting...</span>
        </div>
      )}

      {error && (
        <p className="mt-2 text-[12px] text-danger">{error}</p>
      )}
    </div>
  );
}
