import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { isValidEthAddress, checksumAddress } from "@/lib/crypto/validate";
import { validateOrigin } from "@/lib/csrf";
import { generalLimiter } from "@/lib/rate-limit";

export async function PUT(request: NextRequest) {
  try {
    const rateLimited = await generalLimiter.check(request);
    if (rateLimited) return rateLimited;

    if (!validateOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let user;
    try {
      user = await getSession();
    } catch {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    let address: unknown;
    try {
      const body = await request.json();
      address = body.address;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!address || typeof address !== "string" || !isValidEthAddress(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    let checksummed: string;
    try {
      checksummed = checksumAddress(address);
    } catch {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("users")
      .update({ wallet_address: checksummed })
      .eq("id", user.id);

    if (error) {
      console.error("Wallet update failed:", error.message, "user:", user.id);
      return NextResponse.json(
        { error: "Database error. Try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ wallet_address: checksummed });
  } catch (err) {
    console.error("Wallet PUT crashed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rateLimited = await generalLimiter.check(request);
    if (rateLimited) return rateLimited;

    if (!validateOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let user;
    try {
      user = await getSession();
    } catch {
      return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("users")
      .update({ wallet_address: null })
      .eq("id", user.id);

    if (error) {
      console.error("Wallet delete failed:", error.message, "user:", user.id);
      return NextResponse.json(
        { error: "Database error. Try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ wallet_address: null });
  } catch (err) {
    console.error("Wallet DELETE crashed:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
