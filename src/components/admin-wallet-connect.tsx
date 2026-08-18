"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";

export function AdminWalletConnect() {
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

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
    <button
      onClick={() => openConnectModal?.()}
      className="rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
    >
      Connect Wallet
    </button>
  );
}
