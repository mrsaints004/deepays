"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";

interface WalletConnectProps {
  currentAddress: string | null;
}

export function WalletConnect({ currentAddress }: WalletConnectProps) {
  const [savedAddress, setSavedAddress] = useState(currentAddress);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"idle" | "paste">("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);

  const { openConnectModal } = useConnectModal();
  const { address: connectedAddress, isConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  const saveAddress = useCallback(async (addr: string) => {
    if (savingRef.current) return;
    savingRef.current = true;
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
      setSavedAddress(data.wallet_address);
      setMode("idle");
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save wallet");
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }, []);

  // When a wallet connects via RainbowKit, auto-save the address
  useEffect(() => {
    if (isConnected && connectedAddress && !savedAddress && !savingRef.current) {
      saveAddress(connectedAddress);
    }
  }, [isConnected, connectedAddress, savedAddress, saveAddress]);

  async function handleConnect() {
    setError("");

    // On mobile in-app dApp browsers (OKX, Trust, MetaMask), window.ethereum
    // is injected by the host app. Try that first for the fastest UX.
    const ethereum = (window as unknown as Record<string, unknown>).ethereum as
      | { request: (args: { method: string }) => Promise<string[]> }
      | undefined;

    if (ethereum) {
      try {
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        if (accounts[0]) {
          await saveAddress(accounts[0]);
          return;
        }
      } catch {
        // User rejected or provider errored — fall through to RainbowKit
      }
    }

    // No injected provider (regular mobile browser / desktop without extension)
    // → open RainbowKit modal which handles WalletConnect QR, deep links, etc.
    if (openConnectModal) {
      openConnectModal();
    } else {
      setError("No wallet detected. Use a wallet app\u2019s built-in browser, or paste your address.");
    }
  }

  async function disconnect() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/wallet", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setSavedAddress(null);
      wagmiDisconnect();
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

  if (savedAddress) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium text-muted uppercase tracking-wider">
              Payout Wallet (Base)
            </p>
            <p className="mt-1 text-[14px] font-mono font-medium">
              {savedAddress.slice(0, 6)}...{savedAddress.slice(-4)}
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
            onClick={handleConnect}
            disabled={saving}
            className="flex-1 rounded-xl bg-foreground px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Connecting...
              </span>
            ) : (
              "Connect Wallet"
            )}
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

      {error && (
        <p className="mt-2 text-[12px] text-danger">{error}</p>
      )}
    </div>
  );
}
