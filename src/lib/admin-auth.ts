import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * Validates admin session by checking the cookie token against its HMAC signature.
 * Requires ADMIN_SESSION_SECRET — never falls back to ADMIN_PASSWORD.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("depay_admin")?.value;
  const sig = cookieStore.get("depay_admin_sig")?.value;

  if (!token || !sig) return false;

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    console.error("ADMIN_SESSION_SECRET is not set — admin auth will fail");
    return false;
  }

  // Validate that sig is valid hex before using it
  if (!/^[a-fA-F0-9]+$/.test(sig)) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(token)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
