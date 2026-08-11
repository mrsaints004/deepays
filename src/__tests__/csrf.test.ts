import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { validateOrigin } from "@/lib/csrf";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  const req = new NextRequest("https://depay.app/api/test", {
    method: "POST",
    headers,
  });
  return req;
}

describe("validateOrigin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects when NEXT_PUBLIC_APP_URL is not set", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const req = makeRequest({ origin: "https://depay.app" });
    expect(validateOrigin(req)).toBe(false);
  });

  it("allows matching origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://depay.app";
    const req = makeRequest({ origin: "https://depay.app" });
    expect(validateOrigin(req)).toBe(true);
  });

  it("rejects mismatched origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://depay.app";
    const req = makeRequest({ origin: "https://evil.com" });
    expect(validateOrigin(req)).toBe(false);
  });

  it("allows matching referer when no origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://depay.app";
    const req = makeRequest({ referer: "https://depay.app/some-page" });
    expect(validateOrigin(req)).toBe(true);
  });

  it("rejects mismatched referer", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://depay.app";
    const req = makeRequest({ referer: "https://evil.com/phish" });
    expect(validateOrigin(req)).toBe(false);
  });

  it("rejects invalid origin URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://depay.app";
    const req = makeRequest({ origin: "not-a-url" });
    expect(validateOrigin(req)).toBe(false);
  });

  it("allows requests without origin/referer in non-production", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://depay.app";
    (process.env as Record<string, string>).NODE_ENV = "development";
    const req = makeRequest({});
    expect(validateOrigin(req)).toBe(true);
  });

  it("rejects requests without origin/referer in production", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://depay.app";
    (process.env as Record<string, string>).NODE_ENV = "production";
    const req = makeRequest({});
    expect(validateOrigin(req)).toBe(false);
  });
});
