import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { validateOrigin } from "@/lib/csrf";
import { generalLimiter } from "@/lib/rate-limit";

export async function DELETE(request: NextRequest) {
  const rateLimited = await generalLimiter.check(request);
  if (rateLimited) return rateLimited;

  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { confirmation } = await request.json();

    // Require explicit confirmation to prevent accidental deletion
    if (confirmation !== "DELETE MY ACCOUNT") {
      return NextResponse.json(
        { error: "Please type 'DELETE MY ACCOUNT' to confirm" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Check for unpaid payouts — warn user
    const { data: pendingPayouts } = await admin
      .from("weekly_payouts")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .limit(1);

    if (pendingPayouts && pendingPayouts.length > 0) {
      return NextResponse.json(
        { error: "You have pending payouts. Please wait until they are processed or contact support." },
        { status: 409 }
      );
    }

    // Delete in order respecting foreign keys:
    // 1. payout_transactions
    await admin.from("payout_transactions").delete().eq("user_id", user.id);

    // 2. completions
    await admin.from("completions").delete().eq("user_id", user.id);

    // 3. weekly_payouts
    await admin.from("weekly_payouts").delete().eq("user_id", user.id);

    // 4. users row
    await admin.from("users").delete().eq("id", user.id);

    // 5. Delete auth user (removes session, prevents login)
    if (user.auth_id) {
      await admin.auth.admin.deleteUser(user.auth_id);
    }

    // Audit log
    await admin.from("audit_logs").insert({
      action: "account_deleted",
      target_type: "user",
      target_id: user.id,
      details: { email: user.email, x_username: user.x_username },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

// GET — export user data (GDPR data portability)
export async function GET(request: NextRequest) {
  const rateLimited = await generalLimiter.check(request);
  if (rateLimited) return rateLimited;

  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const [completions, payouts, transactions] = await Promise.all([
    admin.from("completions").select("*").eq("user_id", user.id),
    admin.from("weekly_payouts").select("*").eq("user_id", user.id),
    admin.from("payout_transactions").select("*").eq("user_id", user.id),
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      x_username: user.x_username,
      wallet_address: user.wallet_address,
      created_at: user.created_at,
    },
    completions: completions.data ?? [],
    payouts: payouts.data ?? [],
    transactions: transactions.data ?? [],
  });
}
