import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getWeekStart } from "@/lib/utils";
import crypto from "crypto";

function verifyCronAuth(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;
  const expected = `Bearer ${secret}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const weekStart = getWeekStart();

  // Expire tasks past their expiry date
  const { error: expireError } = await supabase
    .from("tasks")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString());

  if (expireError) {
    console.error("Failed to expire tasks:", expireError);
  }

  // Cleanup stale cron locks (older than 5 minutes) to prevent permanent blocking
  try {
    await supabase.rpc("cleanup_cron_locks");
  } catch {
    console.error("Failed to cleanup cron locks (function may not exist yet)");
  }

  // Cleanup expired rate limit records
  try {
    await supabase.rpc("cleanup_rate_limits");
  } catch {
    console.error("Failed to cleanup rate limits (function may not exist yet)");
  }

  return NextResponse.json({
    success: true,
    week_start: weekStart,
    message: "Weekly reset completed",
  });
}
