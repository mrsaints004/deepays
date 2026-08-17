import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  let dbOk = false;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("tasks").select("id").limit(1);
    dbOk = !error;
  } catch {
    // db unreachable
  }

  const healthy = dbOk;

  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded" },
    { status: healthy ? 200 : 503 }
  );
}
