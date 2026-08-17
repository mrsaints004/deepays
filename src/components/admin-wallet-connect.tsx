"use client";

import { useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect, useConnect } from "wagmi";

function hasInjectedProvider(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as Record<string, unknown>).ethereum;
}

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
      if (hasInjectedProvider()) {
        const injectedConnector =
          connectors.find((c) => c.id === "injected") ||
          connectors.find((c) => c.type === "injected") ||
          connectors.find((c) => c.id === "metaMask") ||
          connectors.find((c) => c.name.toLowerCase().includes("inject"));

        if (injectedConnector) {
          await connectAsync({ connector: injectedConnector });
          return;
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
        !msg.toLowerCase().includes("user refused")
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
