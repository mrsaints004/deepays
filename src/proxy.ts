import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  // ── Supabase auth token refresh ──────────────────────────────────
  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // Refresh the auth token
    await supabase.auth.getUser();
  } else {
    console.error("Supabase env vars missing in proxy — skipping auth refresh");
  }

  // ── Admin route protection at the edge ───────────────────────────
  // Protect /admin pages and /api/admin endpoints before they reach
  // server components. Skip /admin-login and /api/admin/login.
  const isAdminPage =
    pathname.startsWith("/admin") && !pathname.startsWith("/admin-login");
  const isAdminApi =
    pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/login");

  if (isAdminPage || isAdminApi) {
    const token = request.cookies.get("depay_admin")?.value;
    const sig = request.cookies.get("depay_admin_sig")?.value;
    const secret = process.env.ADMIN_SESSION_SECRET;

    let isValidAdmin = false;

    if (token && sig && secret && /^[a-fA-F0-9]+$/.test(sig)) {
      try {
        const expected = crypto
          .createHmac("sha256", secret)
          .update(token)
          .digest("hex");

        isValidAdmin = crypto.timingSafeEqual(
          Buffer.from(sig, "hex"),
          Buffer.from(expected, "hex")
        );
      } catch {
        // Length mismatch or other crypto error — treat as invalid
      }
    }

    if (!isValidAdmin) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin-login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
