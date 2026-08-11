import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

// Simple in-memory rate limiter for admin login
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_MAX_AGE = 4 * 60 * 60; // 4 hours (reduced from 24h)

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  record.count++;
  return record.count > MAX_ATTEMPTS;
}

function constantTimeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  let password: unknown;
  try {
    const body = await request.json();
    password = body.password;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  if (password.length > 256) {
    return NextResponse.json({ error: "Password too long" }, { status: 400 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (!adminPassword || !constantTimeEqual(password, adminPassword)) {
    console.warn(`Failed admin login attempt from IP: ${ip}`);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Require ADMIN_SESSION_SECRET — never use password as HMAC secret
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    console.error("ADMIN_SESSION_SECRET is not set — cannot create admin session");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  // Generate a signed session token using HMAC
  const sessionToken = crypto.randomUUID();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(sessionToken)
    .digest("hex");

  const cookieStore = await cookies();
  cookieStore.set("depay_admin", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  cookieStore.set("depay_admin_sig", signature, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return NextResponse.json({ success: true });
}
