"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatUnits, type Address } from "viem";
import { USDC_ADDRESS, USDC_DECIMALS, ERC20_ABI } from "@/lib/crypto/config";
import { Wallet } from "lucide-react";

export function TreasuryCard() {
  const { address, isConnected } = useAccount();

  const { data: rawBalance } = useReadContract({
    address: USDC_ADDRESS as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const balance = rawBalance != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
        Number(formatUnits(rawBalance as bigint, USDC_DECIMALS))
      )
    : "—";

  return (
    <div className="rounded-2xl bg-card p-5 border border-border shadow-soft-sm border-l-4 border-l-cerulean-500">
      <p className="text-[12px] font-medium text-muted uppercase tracking-wider">Treasury USDC</p>
      {isConnected ? (
        <p className="mt-1 text-2xl font-bold tabular-nums">{balance}</p>
      ) : (
        <p className="mt-1 text-sm text-muted flex items-center gap-1.5"><Wallet size={14} /> Connect wallet to view</p>
      )}
    </div>
  );
}
