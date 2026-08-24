import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${appUrl}/?error=missing_code`);
  }

  // Handle password recovery callback — redirect to reset-password page
  if (type === "recovery") {
    try {
      const supabase = await createServerClient();
      await supabase.auth.exchangeCodeForSession(code);
      return NextResponse.redirect(`${appUrl}/reset-password`);
    } catch {
      return NextResponse.redirect(`${appUrl}/?error=reset_failed`);
    }
  }

  try {
    const supabase = await createServerClient();

    // Exchange the code for a session
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(`${appUrl}/?error=auth_failed`);
    }

    // Get the authenticated user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.redirect(`${appUrl}/?error=auth_failed`);
    }

    // Check if user row exists, create if not
    const admin = createAdminClient();
    const { data: existingUser } = await admin
      .from("users")
      .select("id")
      .eq("auth_id", authUser.id)
      .single();

    if (!existingUser) {
      // Derive username from email or Google name
      const username =
        authUser.user_metadata?.name ||
        authUser.email?.split("@")[0] ||
        "user";

      await admin.from("users").insert({
        auth_id: authUser.id,
        email: authUser.email || null,
        x_username: username,
        x_id: null,
        x_avatar_url: authUser.user_metadata?.avatar_url || "",
        last_login: new Date().toISOString(),
      });
    } else {
      await admin
        .from("users")
        .update({
          last_login: new Date().toISOString(),
          x_avatar_url: authUser.user_metadata?.avatar_url || "",
        })
        .eq("id", existingUser.id);
    }

    return NextResponse.redirect(`${appUrl}/earn`);
  } catch {
    return NextResponse.redirect(`${appUrl}/?error=auth_failed`);
  }
}
