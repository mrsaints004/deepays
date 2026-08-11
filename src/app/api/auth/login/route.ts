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
    const { email, password } = await request.json();

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length > 256) {
      return NextResponse.json(
        { message: "Password is too long" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
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
