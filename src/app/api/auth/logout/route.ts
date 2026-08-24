import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed:", error.message);
      return NextResponse.json({ error: "Failed to sign out" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
