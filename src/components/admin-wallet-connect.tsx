"use client";

import { useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, useConnect } from "wagmi";

export function AdminWalletConnect() {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connectAsync, connectors } = useConnect();

  async function handleConnect() {
    setError("");
    setConnecting(true);

    try {
      // Already connected (auto-reconnect) — nothing to do
      if (isConnected && address) return;

      const injectedConnector = connectors.find(
        (c) => c.type === "injected" || c.id === "injected" || c.id === "io.metamask" || c.id === "metaMask"
      );

      if (injectedConnector) {
        try {
          await connectAsync({ connector: injectedConnector });
          return;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.toLowerCase().includes("already connected")) {
            disconnect();
            await new Promise((r) => setTimeout(r, 300));
            await connectAsync({ connector: injectedConnector });
            return;
          }
          if (msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("user refused")) {
            return;
          }
        }
      }

      if (openConnectModal) {
        openConnectModal();
      } else {
        setError("No wallet detected");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      if (
        !msg.toLowerCase().includes("rejected") &&
        !msg.toLowerCase().includes("denied") &&
        !msg.toLowerCase().includes("user refused") &&
        !msg.toLowerCase().includes("already connected")
      ) {
        setError(msg);
      }
    } finally {
      setConnecting(false);
    }
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-card border border-border px-3 py-1.5 text-[12px] font-mono font-medium">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-muted hover:text-danger hover:border-danger/30 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
  );
}
