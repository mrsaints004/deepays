import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdmin } from "@/lib/admin-auth";
import { validateOrigin } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.delete("depay_admin");
  cookieStore.delete("depay_admin_sig");
  return NextResponse.json({ success: true });
}

// GET logout — only works if admin is currently authenticated
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.redirect(
      new URL("/admin-login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  }

  const cookieStore = await cookies();
  cookieStore.delete("depay_admin");
  cookieStore.delete("depay_admin_sig");
  return NextResponse.redirect(
    new URL("/admin-login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
  );
}
