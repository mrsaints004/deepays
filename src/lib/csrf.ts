import { NextRequest } from "next/server";

/**
 * Validates that the request origin matches the app's URL.
 * Protects cookie-authenticated endpoints from cross-site request forgery.
 * Fails closed: rejects if NEXT_PUBLIC_APP_URL is not configured.
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Fail closed: if app URL is not configured, reject all requests
  if (!appUrl) {
    console.error("CSRF: NEXT_PUBLIC_APP_URL is not set — rejecting request");
    return false;
  }

  // Require at least one of origin or referer for mutating requests
  if (!origin && !referer) {
    // Allow server-side requests (no browser headers) only in non-production
    // In production, browsers always send origin on POST/PUT/PATCH/DELETE
    return process.env.NODE_ENV !== "production";
  }

  const appHost = new URL(appUrl).host.replace(/^www\./, "");

  const matchesHost = (header: string): boolean => {
    try {
      return new URL(header).host.replace(/^www\./, "") === appHost;
    } catch {
      return false;
    }
  };

  if (origin && matchesHost(origin)) return true;
  if (referer && matchesHost(referer)) return true;

  return false;
}
