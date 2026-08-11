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
    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { message: "Password is required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (password.length > 256) {
      return NextResponse.json(
        { message: "Password is too long" },
        { status: 400 }
      );
    }

    // The user arrives with a valid session from the reset link callback
    const supabase = await createServerClient();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return NextResponse.json(
        { message: "Failed to reset password. The link may have expired." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
