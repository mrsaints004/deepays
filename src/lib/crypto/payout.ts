import { parseUnits, formatUnits, type Address } from "viem";
import { getPublicClient, getTreasuryWalletClient } from "./client";
import { USDC_ADDRESS, USDC_DECIMALS, ERC20_ABI } from "./config";
import { isValidEthAddress } from "./validate";

const TX_CONFIRMATION_TIMEOUT = 180_000; // 180 seconds — Base L2 can be slow under congestion
const MAX_SINGLE_PAYOUT = Number(process.env.MAX_SINGLE_PAYOUT) || 10_000;
const MAX_GAS_PRICE_GWEI = 50; // Safety cap: reject if gas price exceeds this on Base

/**
 * Pre-flight check: verify the treasury private key is configured, the derived
 * account can be resolved, and the account holds a non-zero USDC balance.
 * Call this before processing payouts to fail fast on misconfiguration.
 */
export async function validateTreasurySetup(): Promise<{
  address: string;
  balanceUSDC: number;
}> {
  if (!process.env.TREASURY_PRIVATE_KEY) {
    throw new Error(
      "TREASURY_PRIVATE_KEY is not configured — cannot process payouts"
    );
  }

  // This will throw if the key is malformed (regex validation inside)
  const { account } = getTreasuryWalletClient();

  const publicClient = getPublicClient();
  const rawBalance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });

  const balanceUSDC = parseFloat(formatUnits(rawBalance, USDC_DECIMALS));

  if (balanceUSDC <= 0) {
    throw new Error(
      `Treasury account ${account.address} has zero USDC balance — cannot process payouts`
    );
  }

  return { address: account.address, balanceUSDC };
}

export async function sendUSDC(
  toAddress: string,
  amountUSD: number,
  nonce?: number
): Promise<string> {
  // Validate recipient address
  if (!toAddress || !isValidEthAddress(toAddress)) {
    throw new Error("Invalid recipient wallet address");
  }

  // Validate amount
  if (!amountUSD || amountUSD <= 0) {
    throw new Error("Payout amount must be positive");
  }
  if (amountUSD > MAX_SINGLE_PAYOUT) {
    throw new Error(`Payout amount exceeds safety limit of $${MAX_SINGLE_PAYOUT}`);
  }
  if (!Number.isFinite(amountUSD)) {
    throw new Error("Invalid payout amount");
  }

  // Gas price safety check
  const publicClient = getPublicClient();
  const gasPrice = await publicClient.getGasPrice();
  const gasPriceGwei = Number(gasPrice) / 1e9;
  if (gasPriceGwei > MAX_GAS_PRICE_GWEI) {
    throw new Error(
      `Gas price too high: ${gasPriceGwei.toFixed(2)} gwei (limit: ${MAX_GAS_PRICE_GWEI} gwei). Retry later.`
    );
  }

  const { client: walletClient, account } = getTreasuryWalletClient();
  const amount = parseUnits(amountUSD.toFixed(USDC_DECIMALS), USDC_DECIMALS);

  const txHash = await walletClient.writeContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [toAddress as Address, amount],
    account,
    ...(nonce !== undefined ? { nonce } : {}),
  });

  return txHash;
}

/**
 * Get the current nonce for the treasury account.
 * Used for explicit nonce management during sequential payouts.
 */
export async function getTreasuryNonce(): Promise<number> {
  const publicClient = getPublicClient();
  const { account } = getTreasuryWalletClient();
  return publicClient.getTransactionCount({ address: account.address });
}

export async function getTreasuryBalance(): Promise<number> {
  if (!process.env.TREASURY_PRIVATE_KEY) {
    throw new Error("TREASURY_PRIVATE_KEY is not configured");
  }

  const publicClient = getPublicClient();
  const { account } = getTreasuryWalletClient();

  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });

  return parseFloat(formatUnits(balance, USDC_DECIMALS));
}

export async function waitForConfirmation(txHash: string) {
  const publicClient = getPublicClient();

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash as `0x${string}`,
    timeout: TX_CONFIRMATION_TIMEOUT,
  });

  if (receipt.status === "reverted") {
    throw new Error(`Transaction reverted: ${txHash}`);
  }

  return receipt;
}

/**
 * Check if a previously submitted tx was actually mined on-chain.
 * Used before retrying a "failed" payout to prevent double-payments.
 * Returns the receipt if confirmed, null if not found or still pending.
 */
export async function checkTxOnChain(txHash: string): Promise<{ status: "confirmed" | "reverted" } | null> {
  const publicClient = getPublicClient();

  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });
    if (receipt) {
      return { status: receipt.status === "success" ? "confirmed" : "reverted" };
    }
    return null;
  } catch {
    // Transaction not found — not mined
    return null;
  }
}
