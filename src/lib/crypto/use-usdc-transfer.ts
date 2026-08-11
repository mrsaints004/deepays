"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, type Address } from "viem";
import { base } from "wagmi/chains";
import { USDC_ADDRESS, USDC_DECIMALS, ERC20_ABI } from "./config";

export function useUsdcTransfer() {
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  async function sendUSDC(toAddress: string, amountUSD: number): Promise<`0x${string}`> {
    const hash = await writeContractAsync({
      address: USDC_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [toAddress as Address, parseUnits(amountUSD.toString(), USDC_DECIMALS)],
      chainId: base.id,
    });
    return hash;
  }

  return { sendUSDC, txHash, isPending, isConfirming, isConfirmed };
}
