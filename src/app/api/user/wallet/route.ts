import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { isValidEthAddress, checksumAddress } from "@/lib/crypto/validate";
import { validateOrigin } from "@/lib/csrf";
import { generalLimiter } from "@/lib/rate-limit";

export async function PUT(request: NextRequest) {
  const rateLimited = await generalLimiter.check(request);
  if (rateLimited) return rateLimited;

  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      { error: "Invalid Ethereum address checksum" },
      { status: 400 }
    );
  }

  // Use admin client to bypass RLS — we already verified the user above.
  // The anon-key client can fail when the auth session cookie is stale
  // (e.g. in dApp browsers that don't forward cookies reliably).
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ wallet_address: checksummed })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update wallet" },
      { status: 500 }
    );
  }

  return NextResponse.json({ wallet_address: checksummed });
}

export async function DELETE(request: NextRequest) {
  const rateLimited2 = await generalLimiter.check(request);
  if (rateLimited2) return rateLimited2;

  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ wallet_address: null })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to remove wallet" },
      { status: 500 }
    );
  }

  return NextResponse.json({ wallet_address: null });
}
