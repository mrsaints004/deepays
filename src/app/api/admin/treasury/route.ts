import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { getTreasuryBalance } = await import("@/lib/crypto/payout");
    const { getTreasuryWalletClient } = await import("@/lib/crypto/client");

    const balance = await getTreasuryBalance();
    const { account } = getTreasuryWalletClient();

    return NextResponse.json({
      balance_usdc: balance,
      address: account.address,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch treasury balance" },
      { status: 500 }
    );
  }
}
