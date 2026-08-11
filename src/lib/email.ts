import { createAdminClient } from "@/lib/supabase/server";

/**
 * Send email notifications via Supabase Edge Functions or direct SMTP.
 *
 * This uses Supabase's built-in email infrastructure. For production,
 * configure a custom SMTP provider in Supabase Dashboard > Authentication > SMTP.
 *
 * Alternatively, integrate with Resend, SendGrid, or Postmark by setting
 * EMAIL_PROVIDER and the relevant API key in environment variables.
 */

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const provider = process.env.EMAIL_PROVIDER; // "resend" | "sendgrid" | undefined

  if (provider === "resend" && process.env.RESEND_API_KEY) {
    return sendViaResend(payload);
  }

  // Fallback: store notification in DB for in-app display
  return storeNotification(payload);
}

async function sendViaResend(payload: EmailPayload): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Depay <noreply@depay.app>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });
    return res.ok;
  } catch {
    // Log but don't fail the parent operation
    console.error("Failed to send email via Resend");
    return false;
  }
}

async function storeNotification(payload: EmailPayload): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    await supabase.from("notifications").insert({
      email: payload.to,
      subject: payload.subject,
      body_html: payload.html,
      status: "pending",
    });
    return true;
  } catch {
    // Notifications table may not exist — that's OK
    return false;
  }
}

// ——— Notification templates ———

export async function notifyTaskApproved(email: string, taskTitle: string, rewardUsd: number) {
  return sendEmail({
    to: email,
    subject: `Your task "${taskTitle}" was approved`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Task Approved</h2>
        <p>Your submission for <strong>${escapeHtml(taskTitle)}</strong> has been approved.</p>
        <p>You earned <strong>$${rewardUsd.toFixed(2)}</strong> which will be included in your next weekly payout.</p>
        <p style="color: #666; font-size: 13px; margin-top: 24px;">— Depay</p>
      </div>
    `,
  });
}

export async function notifyTaskRejected(email: string, taskTitle: string, note?: string) {
  return sendEmail({
    to: email,
    subject: `Your task "${taskTitle}" was not approved`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Task Not Approved</h2>
        <p>Your submission for <strong>${escapeHtml(taskTitle)}</strong> was not approved.</p>
        ${note ? `<p><strong>Reason:</strong> ${escapeHtml(note)}</p>` : ""}
        <p>You can try submitting again with valid proof.</p>
        <p style="color: #666; font-size: 13px; margin-top: 24px;">— Depay</p>
      </div>
    `,
  });
}

export async function notifyPayoutSent(email: string, amount: number, txHash: string) {
  return sendEmail({
    to: email,
    subject: `Your payout of $${amount.toFixed(2)} has been sent`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Payout Sent</h2>
        <p>Your weekly payout of <strong>$${amount.toFixed(2)} USDC</strong> has been sent to your wallet.</p>
        <p><a href="https://basescan.org/tx/${escapeHtml(txHash)}" style="color: #2563eb;">View transaction on BaseScan</a></p>
        <p style="color: #666; font-size: 13px; margin-top: 24px;">— Depay</p>
      </div>
    `,
  });
}

export async function notifyPayoutFailure(
  failedCount: number,
  totalCount: number,
  errors: Array<{ user: string; error: string }>
) {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminEmail) {
    console.error(
      `[PAYOUT ALERT] ${failedCount}/${totalCount} payouts failed. Set ADMIN_ALERT_EMAIL to receive alerts.`,
      errors
    );
    return false;
  }

  const errorRows = errors
    .map((e) => `<tr><td>${escapeHtml(e.user)}</td><td>${escapeHtml(e.error)}</td></tr>`)
    .join("");

  return sendEmail({
    to: adminEmail,
    subject: `[ALERT] ${failedCount} payout(s) failed`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Payout Failures</h2>
        <p><strong>${failedCount}</strong> out of <strong>${totalCount}</strong> payouts failed during the weekly cron run.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <thead>
            <tr style="border-bottom: 2px solid #e5e7eb;">
              <th style="text-align: left; padding: 8px;">User</th>
              <th style="text-align: left; padding: 8px;">Error</th>
            </tr>
          </thead>
          <tbody>${errorRows}</tbody>
        </table>
        <p style="color: #666; font-size: 13px; margin-top: 24px;">Check the admin dashboard for details. — Depay</p>
      </div>
    `,
  });
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
