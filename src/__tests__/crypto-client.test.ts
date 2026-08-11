import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("private key validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws when TREASURY_PRIVATE_KEY is not set", async () => {
    delete process.env.TREASURY_PRIVATE_KEY;
    // Dynamic import to get fresh module state
    const { getTreasuryWalletClient } = await import("@/lib/crypto/client");
    expect(() => getTreasuryWalletClient()).toThrow("TREASURY_PRIVATE_KEY is not set");
  });

  it("throws when key is missing 0x prefix", async () => {
    process.env.TREASURY_PRIVATE_KEY = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab";
    const { getTreasuryWalletClient } = await import("@/lib/crypto/client");
    expect(() => getTreasuryWalletClient()).toThrow("malformed");
  });

  it("throws when key is too short", async () => {
    process.env.TREASURY_PRIVATE_KEY = "0xabc123";
    const { getTreasuryWalletClient } = await import("@/lib/crypto/client");
    expect(() => getTreasuryWalletClient()).toThrow("malformed");
  });

  it("throws when key contains non-hex characters", async () => {
    process.env.TREASURY_PRIVATE_KEY = "0xGGGGGG1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    const { getTreasuryWalletClient } = await import("@/lib/crypto/client");
    expect(() => getTreasuryWalletClient()).toThrow("malformed");
  });
});
