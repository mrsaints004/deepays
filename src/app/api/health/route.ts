import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  // Check Supabase connectivity
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("tasks").select("id").limit(1);
    checks.database = error ? "error" : "ok";
  } catch {
    checks.database = "error";
  }

  // Check required env vars
  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_PASSWORD",
    "ADMIN_SESSION_SECRET",
    "CRON_SECRET",
  ];
  checks.env = requiredVars.every((v) => process.env[v]) ? "ok" : "error";

  const healthy = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded", checks },
    { status: healthy ? 200 : 503 }
  );
}
