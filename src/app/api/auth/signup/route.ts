import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { validateOrigin } from "@/lib/csrf";
import { authLimiter } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimited = await authLimiter.check(request);
  if (rateLimited) return rateLimited;

  if (!validateOrigin(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { email, password, x_username } = await request.json();

    if (!email || !password || !x_username) {
      return NextResponse.json(
        { message: "Email, password, and X username are required" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || typeof password !== "string" || typeof x_username !== "string") {
      return NextResponse.json(
        { message: "Invalid input types" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (password.length > 256) {
      return NextResponse.json(
        { message: "Password is too long" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: "Invalid email address" },
        { status: 400 }
      );
    }

    // Validate X username format (1-15 alphanumeric/underscore chars)
    const cleanUsername = x_username.replace(/^@/, "");
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleanUsername)) {
      return NextResponse.json(
        { message: "Invalid X username. Use 1-15 characters: letters, numbers, underscores." },
        { status: 400 }
      );
    }

    // Validate email length
    if (email.length > 254) {
      return NextResponse.json(
        { message: "Email address is too long" },
        { status: 400 }
      );
    }

    // Use Supabase signUp which sends a verification email automatically.
    // This requires SMTP to be configured in the Supabase dashboard:
    // Authentication > Email Templates > configure SMTP provider
    const supabase = await createServerClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
        data: {
          x_username: cleanUsername,
        },
      },
    });

    if (authError) {
      const safeMessage = authError.message?.includes("already registered")
        ? "An account with this email already exists"
        : "Failed to create account. Please try again.";
      return NextResponse.json(
        { message: safeMessage },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { message: "Failed to create account" },
        { status: 500 }
      );
    }

    // Create user row using admin client (bypasses RLS)
    const admin = createAdminClient();
    const { error: insertError } = await admin.from("users").insert({
      auth_id: authData.user.id,
      email,
      x_username: cleanUsername,
      x_id: null,
      x_avatar_url: "",
      last_login: new Date().toISOString(),
    });

    if (insertError) {
      return NextResponse.json(
        { message: "Failed to create user profile" },
        { status: 500 }
      );
    }

    // If email confirmation is enabled (no auto-confirm), user needs to verify
    // Supabase returns identities=[] when email confirmation is pending
    const needsVerification = !authData.user.email_confirmed_at;

    if (needsVerification) {
      return NextResponse.json({
        success: true,
        needsVerification: true,
        message: "Account created. Please check your email to verify your account.",
      });
    }

    // If Supabase has email confirmation disabled (dev mode), sign in immediately
    return NextResponse.json({ success: true, needsVerification: false });
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
