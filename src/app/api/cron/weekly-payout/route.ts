import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getWeekStart } from "@/lib/utils";
import { sendUSDC, getTreasuryBalance, waitForConfirmation, checkTxOnChain, getTreasuryNonce, validateTreasurySetup } from "@/lib/crypto/payout";
import { notifyPayoutSent, notifyPayoutFailure } from "@/lib/email";
import crypto from "crypto";

export const maxDuration = 120;

function verifyCronAuth(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;
  const expected = `Bearer ${secret}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Distributed lock: use a cron_locks table or a payout-level lock.
  // Acquire a global lock by inserting a run record. If another run is active, bail out.
  const runId = crypto.randomUUID();
  const { error: lockError } = await supabase
    .from("cron_locks")
    .insert({ id: runId, job_name: "weekly-payout", started_at: new Date().toISOString() });

  if (lockError) {
    if (lockError.message?.includes("does not exist")) {
      console.error("cron_locks table does not exist — run migration-v4.sql before deploying");
      return NextResponse.json({
        error: "Database not fully migrated: cron_locks table missing",
      }, { status: 500 });
    }
    return NextResponse.json({
      error: "Another payout job is already running",
      detail: lockError.message,
    }, { status: 409 });
  }

  try {
    // Pre-flight: verify treasury key is valid and account holds USDC
    try {
      const treasury = await validateTreasurySetup();
      console.log(`[payout] Treasury validated: ${treasury.address} — ${treasury.balanceUSDC} USDC`);
    } catch (treasuryErr) {
      const msg = treasuryErr instanceof Error ? treasuryErr.message : "Treasury validation failed";
      console.error(`[payout] Treasury validation failed: ${msg}`);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Get the previous week's start
    const now = new Date();
    const previousWeekDate = new Date(now);
    previousWeekDate.setUTCDate(previousWeekDate.getUTCDate() - 7);
    const weekStart = getWeekStart(previousWeekDate);

    // Before processing new payouts, check for any "failed" payouts that may have
    // actually succeeded on-chain (phantom payment prevention)
    const { data: failedTxs } = await supabase
      .from("payout_transactions")
      .select("id, payout_id, tx_hash, status")
      .eq("status", "failed")
      .not("tx_hash", "is", null);

    if (failedTxs && failedTxs.length > 0) {
      for (const ftx of failedTxs) {
        if (!ftx.tx_hash) continue;
        const onChainResult = await checkTxOnChain(ftx.tx_hash);
        if (onChainResult?.status === "confirmed") {
          // The tx actually went through — mark it confirmed, not failed
          await supabase
            .from("payout_transactions")
            .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
            .eq("id", ftx.id);

          await supabase
            .from("weekly_payouts")
            .update({
              status: "paid",
              tx_hash: ftx.tx_hash,
              paid_at: new Date().toISOString(),
            })
            .eq("id", ftx.payout_id);
        }
      }
    }

    // Get pending payouts with user wallet addresses
    const { data: payouts, error: fetchError } = await supabase
      .from("weekly_payouts")
      .select("*, users(wallet_address, x_username, email)")
      .eq("week_start", weekStart)
      .eq("status", "pending");

    if (fetchError) {
      return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 });
    }

    if (!payouts || payouts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending payouts for this week",
        week_start: weekStart,
      });
    }

    // Filter payouts with valid wallet addresses and positive amounts
    const payable = payouts.filter((p) => {
      const wallet = (p.users as { wallet_address: string | null; x_username: string; email: string | null } | null)?.wallet_address;
      if (!wallet) return false;
      if (!p.total_usd || p.total_usd <= 0) return false;
      return true;
    });

    if (payable.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No payable users (missing wallets or zero amounts)",
        week_start: weekStart,
        skipped: payouts.length,
      });
    }

    // Check treasury balance
    const totalOwed = payable.reduce((sum, p) => sum + p.total_usd, 0);
    let treasuryBalance: number;
    try {
      treasuryBalance = await getTreasuryBalance();
    } catch {
      return NextResponse.json({ error: "Failed to check treasury balance" }, { status: 500 });
    }

    if (treasuryBalance < totalOwed) {
      return NextResponse.json({
        error: "Insufficient treasury balance",
        treasury_balance: treasuryBalance,
        total_owed: totalOwed,
      }, { status: 400 });
    }

    // Process payouts sequentially with explicit nonce management
    const results: Array<{ user: string; status: string; tx_hash?: string; error?: string }> = [];
    let currentNonce = await getTreasuryNonce();

    for (const payout of payable) {
      const userInfo = payout.users as { wallet_address: string; x_username: string; email: string | null };
      const walletAddress = userInfo.wallet_address;
      const username = userInfo.x_username;
      const userEmail = userInfo.email;

      try {
        // Idempotency check: see if there's already a submitted/confirmed tx for this payout
        const { data: existingTx } = await supabase
          .from("payout_transactions")
          .select("id, tx_hash, status")
          .eq("payout_id", payout.id)
          .in("status", ["submitted", "confirmed"])
          .limit(1)
          .maybeSingle();

        if (existingTx) {
          results.push({ user: username, status: "skipped", error: "Transaction already exists" });
          continue;
        }

        // Atomically lock the payout to prevent double-processing
        const { data: locked, error: lockErr } = await supabase
          .from("weekly_payouts")
          .update({ status: "processing" })
          .eq("id", payout.id)
          .eq("status", "pending")
          .select("id")
          .single();

        if (lockErr || !locked) {
          results.push({ user: username, status: "skipped", error: "Already being processed" });
          continue;
        }

        // Create payout_transactions record
        const { data: txRecord } = await supabase
          .from("payout_transactions")
          .insert({
            payout_id: payout.id,
            user_id: payout.user_id,
            wallet_address: walletAddress,
            amount_usdc: payout.total_usd,
            status: "pending",
          })
          .select()
          .single();

        try {
          const txHash = await sendUSDC(walletAddress, payout.total_usd, currentNonce);

          if (txRecord) {
            await supabase
              .from("payout_transactions")
              .update({ status: "submitted", tx_hash: txHash })
              .eq("id", txRecord.id);
          }

          await waitForConfirmation(txHash);

          if (txRecord) {
            await supabase
              .from("payout_transactions")
              .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
              .eq("id", txRecord.id);
          }

          await supabase
            .from("weekly_payouts")
            .update({
              status: "paid",
              tx_hash: txHash,
              paid_at: new Date().toISOString(),
              paid_amount_usdc: payout.total_usd,
            })
            .eq("id", payout.id);

          currentNonce++;

          // Notify user of payout
          if (userEmail) {
            notifyPayoutSent(userEmail, payout.total_usd, txHash).catch((err) => console.error("[payout] Email notification failed:", err));
          }

          results.push({ user: username, status: "confirmed", tx_hash: txHash });
        } catch (sendErr) {
          // On timeout, DON'T revert to pending — the tx may still confirm.
          // Mark as "failed" but keep the tx_hash for later on-chain verification.
          const errorMsg = sendErr instanceof Error ? sendErr.message : "Unknown error";
          const isTimeout = errorMsg.includes("timeout") || errorMsg.includes("Timeout");

          if (isTimeout && txRecord) {
            // Keep as "processing" — next cron run will check on-chain status
            await supabase
              .from("payout_transactions")
              .update({
                status: "failed",
                error_message: `Timeout waiting for confirmation — tx may still confirm on-chain`,
              })
              .eq("id", txRecord.id);

            // Don't revert to pending — keep as processing to prevent retry
            results.push({ user: username, status: "timeout", error: "Awaiting on-chain confirmation" });
          } else {
            // Genuine failure (e.g., nonce error, insufficient gas) — safe to revert
            await supabase
              .from("weekly_payouts")
              .update({ status: "pending" })
              .eq("id", payout.id);

            if (txRecord) {
              await supabase
                .from("payout_transactions")
                .update({ status: "failed", error_message: errorMsg })
                .eq("id", txRecord.id);
            }

            results.push({ user: username, status: "failed", error: errorMsg });
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        results.push({ user: username, status: "failed", error: errorMsg });
      }
    }

    // Alert on failures
    const failures = results.filter((r) => r.status === "failed" || r.status === "timeout");
    if (failures.length > 0) {
      notifyPayoutFailure(
        failures.length,
        results.length,
        failures.map((f) => ({ user: f.user, error: f.error || "Unknown" }))
      ).catch((err) => console.error("[payout] Email notification failed:", err));
    }

    return NextResponse.json({
      success: true,
      week_start: weekStart,
      processed: results.length,
      skipped: payouts.length - payable.length,
      results,
    });
  } finally {
    // Release the distributed lock
    await supabase
      .from("cron_locks")
      .delete()
      .eq("id", runId);
  }
}
