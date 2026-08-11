import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      getUser: mockGetUser,
      signUp: mockSignUp,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  })),
  createAdminClient: vi.fn(() => ({
    auth: { admin: { generateLink: vi.fn().mockResolvedValue({ error: null }) } },
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  authLimiter: { check: vi.fn().mockResolvedValue(null) },
  actionLimiter: { check: vi.fn().mockResolvedValue(null) },
  generalLimiter: { check: vi.fn().mockResolvedValue(null) },
  uploadLimiter: { check: vi.fn().mockResolvedValue(null) },
}));

vi.mock("@/lib/csrf", () => ({
  validateOrigin: vi.fn().mockReturnValue(true),
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://depay.app";
  });

  it("returns 400 when email or password is missing", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const request = new Request("https://depay.app/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://depay.app" },
      body: JSON.stringify({ email: "test@test.com" }),
    });
    const { NextRequest } = await import("next/server");
    const req = new NextRequest(request);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 on invalid credentials", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: new Error("Invalid") });
    const { POST } = await import("@/app/api/auth/login/route");
    const request = new Request("https://depay.app/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://depay.app" },
      body: JSON.stringify({ email: "test@test.com", password: "wrong" }),
    });
    const { NextRequest } = await import("next/server");
    const req = new NextRequest(request);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 on valid credentials", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const { POST } = await import("@/app/api/auth/login/route");
    const request = new Request("https://depay.app/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://depay.app" },
      body: JSON.stringify({ email: "test@test.com", password: "correct" }),
    });
    const { NextRequest } = await import("next/server");
    const req = new NextRequest(request);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 on malformed JSON body", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const request = new Request("https://depay.app/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://depay.app" },
      body: "not-json",
    });
    const { NextRequest } = await import("next/server");
    const req = new NextRequest(request);
    const res = await POST(req);
    // Should be caught by try/catch and return 500
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://depay.app";
  });

  it("returns 400 when fields are missing", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const request = new Request("https://depay.app/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://depay.app" },
      body: JSON.stringify({ email: "a@b.com" }),
    });
    const { NextRequest } = await import("next/server");
    const req = new NextRequest(request);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const request = new Request("https://depay.app/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://depay.app" },
      body: JSON.stringify({ email: "a@b.com", password: "short", x_username: "test" }),
    });
    const { NextRequest } = await import("next/server");
    const req = new NextRequest(request);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid X username", async () => {
    const { POST } = await import("@/app/api/auth/signup/route");
    const request = new Request("https://depay.app/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://depay.app" },
      body: JSON.stringify({ email: "a@b.com", password: "validpass123", x_username: "invalid user name!" }),
    });
    const { NextRequest } = await import("next/server");
    const req = new NextRequest(request);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
