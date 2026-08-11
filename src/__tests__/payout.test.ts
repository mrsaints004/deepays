import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the crypto client
vi.mock("@/lib/crypto/client", () => ({
  getPublicClient: vi.fn(() => ({
    getGasPrice: vi.fn().mockResolvedValue(BigInt(1_000_000_000)), // 1 gwei
    waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    getTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    readContract: vi.fn().mockResolvedValue(BigInt(1_000_000_000)), // 1000 USDC
    getTransactionCount: vi.fn().mockResolvedValue(0),
  })),
  getTreasuryWalletClient: vi.fn(() => ({
    client: {
      writeContract: vi.fn().mockResolvedValue("0x" + "a".repeat(64)),
    },
    account: {
      address: "0x" + "1".repeat(40),
    },
  })),
}));

// Mock viem functions
vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    parseUnits: vi.fn(() => BigInt(1_000_000)),
    formatUnits: vi.fn(() => "1000.000000"),
  };
});

vi.mock("@/lib/crypto/validate", () => ({
  isValidEthAddress: vi.fn((addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr)),
}));

import { sendUSDC, getTreasuryBalance, waitForConfirmation, checkTxOnChain, getTreasuryNonce } from "@/lib/crypto/payout";
import { getPublicClient } from "@/lib/crypto/client";

describe("sendUSDC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validAddress = "0x" + "a".repeat(40);

  it("rejects invalid wallet address", async () => {
    await expect(sendUSDC("not-an-address", 10)).rejects.toThrow("Invalid recipient wallet address");
  });

  it("rejects empty address", async () => {
    await expect(sendUSDC("", 10)).rejects.toThrow("Invalid recipient wallet address");
  });

  it("rejects zero amount", async () => {
    await expect(sendUSDC(validAddress, 0)).rejects.toThrow("Payout amount must be positive");
  });

  it("rejects negative amount", async () => {
    await expect(sendUSDC(validAddress, -5)).rejects.toThrow("Payout amount must be positive");
  });

  it("rejects amount above safety limit", async () => {
    await expect(sendUSDC(validAddress, 10_001)).rejects.toThrow("exceeds safety limit");
  });

  it("rejects NaN amount", async () => {
    await expect(sendUSDC(validAddress, NaN)).rejects.toThrow("Payout amount must be positive");
  });

  it("rejects Infinity amount", async () => {
    await expect(sendUSDC(validAddress, Infinity)).rejects.toThrow();
  });

  it("rejects when gas price is too high", async () => {
    const mockPublicClient = getPublicClient();
    vi.mocked(mockPublicClient.getGasPrice).mockResolvedValueOnce(BigInt(51_000_000_000)); // 51 gwei
    vi.mocked(getPublicClient).mockReturnValueOnce(mockPublicClient);

    await expect(sendUSDC(validAddress, 10)).rejects.toThrow("Gas price too high");
  });

  it("returns transaction hash on success", async () => {
    const txHash = await sendUSDC(validAddress, 10);
    expect(txHash).toMatch(/^0x/);
  });

  it("accepts explicit nonce", async () => {
    const txHash = await sendUSDC(validAddress, 10, 5);
    expect(txHash).toMatch(/^0x/);
  });
});

describe("waitForConfirmation", () => {
  it("throws on reverted transaction", async () => {
    const mockPublicClient = getPublicClient();
    vi.mocked(mockPublicClient.waitForTransactionReceipt).mockResolvedValueOnce({
      status: "reverted",
    } as never);
    vi.mocked(getPublicClient).mockReturnValueOnce(mockPublicClient);

    await expect(waitForConfirmation("0x" + "a".repeat(64))).rejects.toThrow("Transaction reverted");
  });
});

describe("checkTxOnChain", () => {
  it("returns confirmed for successful transactions", async () => {
    const result = await checkTxOnChain("0x" + "a".repeat(64));
    expect(result).toEqual({ status: "confirmed" });
  });

  it("returns null when transaction is not found", async () => {
    const mockPublicClient = getPublicClient();
    vi.mocked(mockPublicClient.getTransactionReceipt).mockRejectedValueOnce(new Error("not found"));
    vi.mocked(getPublicClient).mockReturnValueOnce(mockPublicClient);

    const result = await checkTxOnChain("0x" + "b".repeat(64));
    expect(result).toBeNull();
  });
});

describe("getTreasuryNonce", () => {
  it("returns the current nonce", async () => {
    const nonce = await getTreasuryNonce();
    expect(typeof nonce).toBe("number");
  });
});

describe("getTreasuryBalance", () => {
  it("throws when TREASURY_PRIVATE_KEY is not set", async () => {
    const originalKey = process.env.TREASURY_PRIVATE_KEY;
    delete process.env.TREASURY_PRIVATE_KEY;

    await expect(getTreasuryBalance()).rejects.toThrow("TREASURY_PRIVATE_KEY is not configured");

    process.env.TREASURY_PRIVATE_KEY = originalKey;
  });

  it("returns balance as a number when key is set", async () => {
    process.env.TREASURY_PRIVATE_KEY = "0x" + "a".repeat(64);
    const balance = await getTreasuryBalance();
    expect(typeof balance).toBe("number");
  });
});
