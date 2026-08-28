import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Rate limiter with dual strategy:
 * 1. In-memory Map for fast first-pass (works per-instance)
 * 2. Supabase-backed check for cross-instance enforcement
 *
 * Falls back to in-memory only if Supabase call fails.
 */
export class RateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private maxRequests: number;
  private windowMs: number;
  private prefix: string;

  constructor(maxRequests: number, windowMs: number, prefix: string = "rl") {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.prefix = prefix;
  }

  /**
   * Check if a request is rate limited.
   * Returns null if allowed, or a NextResponse (429) if blocked.
   */
  async check(request: NextRequest): Promise<NextResponse | null> {
    const ip = this.getIP(request);
    const now = Date.now();

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      this.cleanup(now);
    }

    // Fast in-memory check first
    const record = this.store.get(ip);
    if (record && now <= record.resetAt && record.count >= this.maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      return NextResponse.json(
        { message: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Update in-memory
    if (!record || now > record.resetAt) {
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
    } else {
      record.count++;
    }

    // Cross-instance check via Supabase
    try {
      const supabase = createAdminClient();
      const key = `${this.prefix}:${ip}`;
      const { data } = await supabase.rpc("check_rate_limit", {
        p_key: key,
        p_max_requests: this.maxRequests,
        p_window_ms: this.windowMs,
      });

      if (data === true) {
        const retryAfter = Math.ceil(this.windowMs / 1000);
        return NextResponse.json(
          { message: "Too many requests. Please try again later." },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
      }
    } catch {
      // Supabase rate limit check failed — fall back to in-memory only
      // In-memory check already passed above, so allow the request
    }

    return null;
  }

  /**
   * Synchronous check — in-memory only, for backward compatibility.
   * Use async check() for cross-instance enforcement.
   */
  checkSync(request: NextRequest): NextResponse | null {
    const ip = this.getIP(request);
    const now = Date.now();

    if (Math.random() < 0.01) {
      this.cleanup(now);
    }

    const record = this.store.get(ip);

    if (!record || now > record.resetAt) {
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
      return null;
    }

    record.count++;

    if (record.count >= this.maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      return NextResponse.json(
        { message: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    return null;
  }

  private getIP(request: NextRequest): string {
    return (
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"
    );
  }

  private cleanup(now: number) {
    for (const [key, record] of this.store) {
      if (now > record.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

// Pre-configured limiters for different endpoint types
// Auth endpoints: 10 requests per 15 minutes (strict)
export const authLimiter = new RateLimiter(10, 15 * 60 * 1000, "auth");

// Task/action endpoints: 30 requests per minute
export const actionLimiter = new RateLimiter(30, 60 * 1000, "action");

// Upload endpoints: 10 uploads per minute
export const uploadLimiter = new RateLimiter(10, 60 * 1000, "upload");

// General API: 60 requests per minute
export const generalLimiter = new RateLimiter(60, 60 * 1000, "general");
