import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { validateOrigin } from "@/lib/csrf";
import { authLimiter } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimited = await authLimiter.check(request);
  if (rateLimited) return rateLimited;

  if (!validateOrigin(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: "A valid email is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Use Supabase's built-in password reset email
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`;
    const { error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    // Always return success to prevent email enumeration
    if (error) {
      console.error("Password reset error:", error.message);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset link has been sent.",
    });
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
