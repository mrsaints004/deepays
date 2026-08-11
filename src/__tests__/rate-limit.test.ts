import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock createAdminClient before importing RateLimiter
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
  }),
}));

import { RateLimiter } from "@/lib/rate-limit";

function makeRequest(ip: string = "127.0.0.1"): NextRequest {
  return new NextRequest("https://depay.app/api/test", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("RateLimiter", () => {
  describe("checkSync", () => {
    it("allows requests within the limit", () => {
      const limiter = new RateLimiter(3, 60_000);
      const req = makeRequest();

      expect(limiter.checkSync(req)).toBeNull();
      expect(limiter.checkSync(req)).toBeNull();
      expect(limiter.checkSync(req)).toBeNull();
    });

    it("blocks requests exceeding the limit", () => {
      const limiter = new RateLimiter(2, 60_000);
      const req = makeRequest();

      limiter.checkSync(req); // 1
      limiter.checkSync(req); // 2
      const result = limiter.checkSync(req); // 3 — should be blocked

      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);
    });

    it("tracks different IPs independently", () => {
      const limiter = new RateLimiter(1, 60_000);

      const req1 = makeRequest("1.1.1.1");
      const req2 = makeRequest("2.2.2.2");

      expect(limiter.checkSync(req1)).toBeNull();
      expect(limiter.checkSync(req2)).toBeNull();

      // Now both should be blocked
      expect(limiter.checkSync(req1)).not.toBeNull();
      expect(limiter.checkSync(req2)).not.toBeNull();
    });

    it("returns null for unknown IP (fallback)", () => {
      const limiter = new RateLimiter(5, 60_000);
      const req = new NextRequest("https://depay.app/api/test", {
        method: "POST",
      });
      expect(limiter.checkSync(req)).toBeNull();
    });

    it("includes Retry-After header when rate limited", () => {
      const limiter = new RateLimiter(1, 30_000);
      const req = makeRequest();

      limiter.checkSync(req);
      const result = limiter.checkSync(req);

      expect(result).not.toBeNull();
      expect(result?.headers.get("Retry-After")).toBeTruthy();
    });
  });

  describe("check (async)", () => {
    it("allows requests within the limit", async () => {
      const limiter = new RateLimiter(3, 60_000, "test");
      const req = makeRequest();

      const result = await limiter.check(req);
      expect(result).toBeNull();
    });
  });
});
