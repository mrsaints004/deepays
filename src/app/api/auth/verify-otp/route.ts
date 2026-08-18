import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateOrigin } from "@/lib/csrf";
import { authLimiter } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimited = await authLimiter.check(request);
  if (rateLimited) return rateLimited;

  if (!validateOrigin(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { email, token } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    if (!token || typeof token !== "string" || !/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { message: "A valid 6-digit code is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (error) {
      const msg = error.message?.toLowerCase().includes("expired")
        ? "Code has expired. Please request a new one."
        : "Invalid verification code. Please try again.";
      return NextResponse.json({ message: msg }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
