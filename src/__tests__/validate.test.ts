import { describe, it, expect } from "vitest";
import { isValidEthAddress, checksumAddress } from "@/lib/crypto/validate";

describe("isValidEthAddress", () => {
  it("accepts valid lowercase address", () => {
    expect(isValidEthAddress("0x" + "a".repeat(40))).toBe(true);
  });

  it("accepts valid checksummed address", () => {
    expect(isValidEthAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed")).toBe(true);
  });

  it("rejects too-short address", () => {
    expect(isValidEthAddress("0xabc")).toBe(false);
  });

  it("rejects non-hex address", () => {
    expect(isValidEthAddress("0x" + "g".repeat(40))).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidEthAddress("")).toBe(false);
  });

  it("rejects address without 0x prefix", () => {
    expect(isValidEthAddress("a".repeat(40))).toBe(false);
  });
});

describe("checksumAddress", () => {
  it("returns checksummed version of a valid address", () => {
    const result = checksumAddress("0x" + "a".repeat(40));
    expect(result).toMatch(/^0x/);
    expect(result.length).toBe(42);
  });
});
