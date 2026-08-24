/**
 * Validate required environment variables at import time.
 * Import this module in layout.tsx or middleware to catch missing vars early.
 */

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
] as const;

const optional = [
  "CRON_SECRET",
  "TREASURY_PRIVATE_KEY",
  "BASE_RPC_URL",
  "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
  "NEXT_PUBLIC_SENTRY_DSN",
] as const;

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0 && process.env.NODE_ENV === "production") {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`
  );
}

if (missing.length > 0 && process.env.NODE_ENV === "development") {
  console.warn(
    `[env] Missing required environment variables: ${missing.join(", ")}`
  );
}

// Validate ADMIN_SESSION_SECRET format (must be 64-char hex string)
const sessionSecret = process.env.ADMIN_SESSION_SECRET;
if (sessionSecret && !/^[a-fA-F0-9]{64}$/.test(sessionSecret)) {
  const msg = "ADMIN_SESSION_SECRET must be a 64-character hex string. Generate one with: openssl rand -hex 32";
  if (process.env.NODE_ENV === "production") {
    throw new Error(msg);
  } else {
    console.warn(`[env] ${msg}`);
  }
}

const missingOptional = optional.filter((key) => !process.env[key]);
if (missingOptional.length > 0 && process.env.NODE_ENV === "development") {
  console.warn(
    `[env] Missing optional environment variables (some features disabled): ${missingOptional.join(", ")}`
  );
}
