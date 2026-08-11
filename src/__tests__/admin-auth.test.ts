import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// Mock next/headers cookies
const mockCookies = new Map<string, { value: string }>();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => mockCookies.get(name),
    getAll: () => [],
    set: vi.fn(),
  })),
}));

import { verifyAdmin } from "@/lib/admin-auth";

describe("verifyAdmin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockCookies.clear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns false when no cookies are set", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    expect(await verifyAdmin()).toBe(false);
  });

  it("returns false when ADMIN_SESSION_SECRET is not set", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    mockCookies.set("depay_admin", { value: "some-token" });
    mockCookies.set("depay_admin_sig", { value: "some-sig" });
    expect(await verifyAdmin()).toBe(false);
  });

  it("returns false for invalid signature", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    mockCookies.set("depay_admin", { value: "some-token" });
    mockCookies.set("depay_admin_sig", { value: "aa".repeat(32) });
    expect(await verifyAdmin()).toBe(false);
  });

  it("returns false for non-hex signature", async () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    mockCookies.set("depay_admin", { value: "some-token" });
    mockCookies.set("depay_admin_sig", { value: "not-hex-at-all!" });
    expect(await verifyAdmin()).toBe(false);
  });

  it("returns true for valid token + signature pair", async () => {
    const secret = "test-secret-key-for-hmac";
    process.env.ADMIN_SESSION_SECRET = secret;

    const token = crypto.randomUUID();
    const signature = crypto
      .createHmac("sha256", secret)
      .update(token)
      .digest("hex");

    mockCookies.set("depay_admin", { value: token });
    mockCookies.set("depay_admin_sig", { value: signature });

    expect(await verifyAdmin()).toBe(true);
  });

  it("returns false when token is tampered", async () => {
    const secret = "test-secret-key-for-hmac";
    process.env.ADMIN_SESSION_SECRET = secret;

    const originalToken = crypto.randomUUID();
    const signature = crypto
      .createHmac("sha256", secret)
      .update(originalToken)
      .digest("hex");

    mockCookies.set("depay_admin", { value: "tampered-token" });
    mockCookies.set("depay_admin_sig", { value: signature });

    expect(await verifyAdmin()).toBe(false);
  });
});
