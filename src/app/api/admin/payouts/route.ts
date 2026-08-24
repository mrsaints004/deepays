import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendUSDC, waitForConfirmation, checkTxOnChain } from "@/lib/crypto/payout";
import { isValidEthAddress } from "@/lib/crypto/validate";
import { validateOrigin } from "@/lib/csrf";
import { verifyAdmin } from "@/lib/admin-auth";
import { generalLimiter } from "@/lib/rate-limit";

export const maxDuration = 120;

// GET — fetch payouts for a specific week
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const week = request.nextUrl.searchParams.get("week");
  if (!week) {
    return NextResponse.json({ error: "Missing week parameter" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return NextResponse.json({ error: "Invalid week format. Expected YYYY-MM-DD" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("weekly_payouts")
      .select("*, users(x_username, wallet_address)")
      .eq("week_start", week)
      .order("total_usd", { ascending: false });

    if (error) {
      console.error("Failed to fetch payouts:", error);
      return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 });
    }

    return NextResponse.json({ payouts: data ?? [] });
  } catch (err) {
    console.error("Payouts GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — trigger crypto payout for specific payout IDs
export async function POST(request: NextRequest) {
  const rateLimited = await generalLimiter.check(request);
  if (rateLimited) return rateLimited;

  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payoutIds: unknown;
  try {
    const body = await request.json();
    payoutIds = body.payoutIds;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!Array.isArray(payoutIds) || payoutIds.length === 0 || !payoutIds.every((id: unknown) => typeof id === "string")) {
    return NextResponse.json({ error: "Missing or invalid payoutIds" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const results: Array<{ payoutId: string; success: boolean; tx_hash?: string; error?: string }> = [];

  for (const payoutId of payoutIds) {
    try {
      // Idempotency: check for existing submitted/confirmed transaction
      const { data: existingTx } = await supabase
        .from("payout_transactions")
        .select("id, tx_hash, status")
        .eq("payout_id", payoutId)
        .in("status", ["submitted", "confirmed"])
        .limit(1)
        .maybeSingle();

      if (existingTx) {
        results.push({ payoutId, success: false, error: "Transaction already exists for this payout" });
        continue;
      }

      // Fetch payout with user wallet — only process if still pending
      const { data: payout } = await supabase
        .from("weekly_payouts")
        .select("*, users(wallet_address)")
        .eq("id", payoutId)
        .eq("status", "pending")
        .single();

      if (!payout) {
        results.push({ payoutId, success: false, error: "Payout not found or already processed" });
        continue;
      }

      const walletAddress = (payout.users as { wallet_address: string | null } | null)?.wallet_address;
      if (!walletAddress) {
        results.push({ payoutId, success: false, error: "No wallet address" });
        continue;
      }

      // Validate wallet address before sending
      if (!isValidEthAddress(walletAddress)) {
        results.push({ payoutId, success: false, error: "Invalid wallet address in database" });
        continue;
      }

      // Validate payout amount
      if (!payout.total_usd || payout.total_usd <= 0) {
        results.push({ payoutId, success: false, error: "Invalid payout amount" });
        continue;
      }

      // Atomically mark as "processing" to prevent double-payout
      const { data: locked, error: lockError } = await supabase
        .from("weekly_payouts")
        .update({ status: "processing" })
        .eq("id", payoutId)
        .eq("status", "pending")
        .select("id")
        .single();

      if (lockError || !locked) {
        results.push({ payoutId, success: false, error: "Already being processed" });
        continue;
      }

      // Validate amount precision before sending
      if (!Number.isFinite(payout.total_usd) || payout.total_usd <= 0) {
        results.push({ payoutId, success: false, error: "Invalid payout amount" });
        continue;
      }

      // Create payout_transactions record
      const { data: txRecord, error: txInsertErr } = await supabase
        .from("payout_transactions")
        .insert({
          payout_id: payoutId,
          user_id: payout.user_id,
          wallet_address: walletAddress,
          amount_usdc: payout.total_usd,
          status: "pending",
        })
        .select()
        .single();

      if (txInsertErr || !txRecord) {
        // Revert payout status since we couldn't create the tx record
        await supabase.from("weekly_payouts").update({ status: "pending" }).eq("id", payoutId);
        results.push({ payoutId, success: false, error: "Failed to create transaction record" });
        continue;
      }

      try {
        // Send USDC
        const txHash = await sendUSDC(walletAddress, payout.total_usd);

        // Update transaction as submitted
        await supabase
          .from("payout_transactions")
          .update({ status: "submitted", tx_hash: txHash })
          .eq("id", txRecord.id);

        // Wait for confirmation
        await waitForConfirmation(txHash);

        // Update transaction as confirmed
        await supabase
          .from("payout_transactions")
          .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
          .eq("id", txRecord.id);

        // Update weekly payout as paid
        await supabase
          .from("weekly_payouts")
          .update({
            status: "paid",
            tx_hash: txHash,
            paid_at: new Date().toISOString(),
            paid_amount_usdc: payout.total_usd,
          })
          .eq("id", payoutId);

        // Audit log
        await supabase.from("audit_logs").insert({
          action: "payout_sent",
          target_type: "weekly_payout",
          target_id: payoutId,
          details: { tx_hash: txHash, amount: payout.total_usd, wallet: walletAddress },
        });

        results.push({ payoutId, success: true, tx_hash: txHash });
      } catch (sendErr) {
        const errorMsg = sendErr instanceof Error ? sendErr.message : "Unknown error";
        const isTimeout = errorMsg.includes("timeout") || errorMsg.includes("Timeout");

        if (isTimeout && txRecord) {
          // Keep as processing — don't revert, tx may still confirm
          await supabase
            .from("payout_transactions")
            .update({
              status: "failed",
              error_message: "Timeout — tx may still confirm on-chain",
            })
            .eq("id", txRecord.id);
        } else {
          // Safe to revert
          await supabase
            .from("weekly_payouts")
            .update({ status: "pending" })
            .eq("id", payoutId);

          if (txRecord) {
            await supabase
              .from("payout_transactions")
              .update({ status: "failed", error_message: errorMsg })
              .eq("id", txRecord.id);
          }
        }

        throw sendErr;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      results.push({ payoutId, success: false, error: errorMsg });
    }
  }

  return NextResponse.json({ results });
}

// PATCH — wallet-connect payout flow: lock → confirm → revert
export async function PATCH(request: NextRequest) {
  const rateLimited = await generalLimiter.check(request);
  if (rateLimited) return rateLimited;

  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let action: unknown, payoutId: unknown, txHash: unknown;
  try {
    const body = await request.json();
    action = body.action;
    payoutId = body.payoutId;
    txHash = body.txHash;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!payoutId || typeof payoutId !== "string" || !action || typeof action !== "string") {
    return NextResponse.json({ error: "Missing payoutId or action" }, { status: 400 });
  }

  if (!["lock", "confirm", "revert"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (action === "lock") {
    // Atomically pending → processing
    const { data: payout, error: fetchErr } = await supabase
      .from("weekly_payouts")
      .select("*, users(wallet_address)")
      .eq("id", payoutId)
      .eq("status", "pending")
      .single();

    if (fetchErr || !payout) {
      return NextResponse.json({ error: "Payout not found or already processing" }, { status: 409 });
    }

    const walletAddress = (payout.users as { wallet_address: string | null } | null)?.wallet_address;
    if (!walletAddress) {
      return NextResponse.json({ error: "No wallet address" }, { status: 400 });
    }

    const { error: lockErr } = await supabase
      .from("weekly_payouts")
      .update({ status: "processing" })
      .eq("id", payoutId)
      .eq("status", "pending");

    if (lockErr) {
      return NextResponse.json({ error: "Failed to lock payout" }, { status: 500 });
    }

    // Create payout_transactions record
    await supabase.from("payout_transactions").insert({
      payout_id: payoutId,
      user_id: payout.user_id,
      wallet_address: walletAddress,
      amount_usdc: payout.total_usd,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      walletAddress,
      amountUSD: payout.total_usd,
    });
  }

  if (action === "confirm") {
    if (!txHash || typeof txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ error: "Missing or invalid txHash" }, { status: 400 });
    }

    // Verify the tx exists on-chain before confirming
    try {
      const onChainResult = await checkTxOnChain(txHash);
      if (!onChainResult) {
        return NextResponse.json({ error: "Transaction not found on-chain yet — try again shortly" }, { status: 400 });
      }
      if (onChainResult.status === "reverted") {
        return NextResponse.json({ error: "Transaction was reverted on-chain" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Failed to verify transaction on-chain" }, { status: 500 });
    }

    // Update payout_transactions
    await supabase
      .from("payout_transactions")
      .update({ status: "submitted", tx_hash: txHash })
      .eq("payout_id", payoutId)
      .eq("status", "pending");

    // Mark weekly payout as paid
    const { error } = await supabase
      .from("weekly_payouts")
      .update({
        status: "paid",
        tx_hash: txHash,
        paid_at: new Date().toISOString(),
      })
      .eq("id", payoutId);

    if (error) {
      return NextResponse.json({ error: "Failed to confirm" }, { status: 500 });
    }

    await supabase.from("audit_logs").insert({
      action: "payout_confirmed_walletconnect",
      target_type: "weekly_payout",
      target_id: payoutId,
      details: { tx_hash: txHash },
    });

    return NextResponse.json({ success: true });
  }

  if (action === "revert") {
    // processing → pending on failure
    await supabase
      .from("weekly_payouts")
      .update({ status: "pending" })
      .eq("id", payoutId)
      .eq("status", "processing");

    // Mark latest transaction as failed
    await supabase
      .from("payout_transactions")
      .update({ status: "failed", error_message: "Wallet rejected or failed" })
      .eq("payout_id", payoutId)
      .eq("status", "pending");

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// PUT — manually mark a payout as paid (requires tx_hash for verification)
export async function PUT(request: NextRequest) {
  const rateLimited = await generalLimiter.check(request);
  if (rateLimited) return rateLimited;

  if (!validateOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payoutId: unknown, status: unknown, tx_hash: unknown, reason: unknown;
  try {
    const body = await request.json();
    payoutId = body.payoutId;
    status = body.status;
    tx_hash = body.tx_hash;
    reason = body.reason;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!payoutId || typeof payoutId !== "string" || !status || typeof status !== "string") {
    return NextResponse.json({ error: "Missing payoutId or status" }, { status: 400 });
  }

  if (!["paid", "pending"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Require tx_hash when manually marking as paid — prevents false records
  if (status === "paid") {
    if (!tx_hash || typeof tx_hash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(tx_hash)) {
      return NextResponse.json({ error: "A valid tx_hash is required to mark as paid" }, { status: 400 });
    }

    // Verify the tx actually exists on-chain
    const onChainResult = await checkTxOnChain(tx_hash);
    if (!onChainResult) {
      return NextResponse.json({ error: "Transaction not found on-chain" }, { status: 400 });
    }
    if (onChainResult.status === "reverted") {
      return NextResponse.json({ error: "Transaction was reverted on-chain" }, { status: 400 });
    }
  }

  // Require a reason for manual overrides
  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    return NextResponse.json({ error: "A reason is required for manual payout updates" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const updateData: Record<string, unknown> = { status };
  if (tx_hash) updateData.tx_hash = tx_hash;
  if (status === "paid") updateData.paid_at = new Date().toISOString();

  const { error } = await supabase
    .from("weekly_payouts")
    .update(updateData)
    .eq("id", payoutId);

  if (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  // Audit log for manual override
  await supabase.from("audit_logs").insert({
    action: `payout_manual_${status}`,
    target_type: "weekly_payout",
    target_id: payoutId,
    details: { tx_hash: tx_hash || null, reason: reason.trim().slice(0, 500) },
  });

  return NextResponse.json({ success: true });
}
