"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

const testimonials = [
  {
    name: "Sara Nguyen",
    handle: "CEO, Luminar Labs",
    quote: "We ran a product launch through Depay and got 3x the engagement we normally see. Real accounts, real interactions — not the bot farms you get elsewhere.",
    metric: "3x engagement",
    seed: "Sara",
  },
  {
    name: "James Okonkwo",
    handle: "Founder, ChainPulse",
    quote: "Our X impressions jumped 400% in the first week. The proof-based system means every like and retweet is from a verified person, not a script.",
    metric: "400% impressions",
    seed: "James",
  },
  {
    name: "Elena Petrov",
    handle: "Head of Growth, Vaultix",
    quote: "We\u2019ve tried five engagement platforms. Depay is the only one where the engagement actually sticks — followers don\u2019t vanish after a week.",
    metric: "92% retention",
    seed: "Elena",
  },
  {
    name: "Ryan Torres",
    handle: "Co-founder, Minted Protocol",
    quote: "Depay solved our cold-start problem. We went from 200 followers to 4k in a month with consistent, organic-looking engagement on every post.",
    metric: "20x follower growth",
    seed: "Ryan",
  },
];

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [xUsername, setXUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup" && password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, x_username: xUsername };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({ message: "Server error" }));

      if (!res.ok) {
        setError(data.message || "Something went wrong");
        setLoading(false);
        return;
      }

      if (data.needsVerification) {
        setVerificationSent(true);
        setLoading(false);
        return;
      }

      window.location.href = "/earn";
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Verification failed");
        setVerifying(false);
        return;
      }
      window.location.href = "/earn";
    } catch {
      setError("Something went wrong. Please try again.");
      setVerifying(false);
    }
  }

  async function handleResendOtp() {
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to resend code");
      }
    } catch {
      setError("Failed to resend code");
    } finally {
      setResending(false);
    }
  }

  if (verificationSent) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <h1 className="text-xl font-semibold">Verify your email</h1>
          <p className="mt-2 text-sm text-muted">
            We sent a 6-digit code to <strong>{email}</strong>. Enter it below to activate your account.
          </p>

          <div className="mt-6 space-y-3">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtpCode(val);
                setError("");
              }}
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-center text-xl font-mono font-semibold tracking-[0.5em] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
            />

            {error && (
              <p className="text-[13px] text-danger font-medium">{error}</p>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={verifying || otpCode.length !== 6}
              className="w-full rounded-xl bg-accent py-3 text-[14px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {verifying ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Verifying...
                </span>
              ) : (
                "Verify"
              )}
            </button>

            <button
              onClick={handleResendOtp}
              disabled={resending}
              className="text-sm font-medium text-accent hover:underline disabled:opacity-50"
            >
              {resending ? "Resending..." : "Resend code"}
            </button>
          </div>

          <button
            onClick={() => {
              setVerificationSent(false);
              setOtpCode("");
              setError("");
              setMode("login");
            }}
            className="mt-4 text-sm font-medium text-muted hover:text-foreground"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <Image src="/Deepay_logo_option_1_ransparent.png" alt="Depay" width={32} height={32} className="rounded-lg" />
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              Depay
            </span>
          </div>
          <button
            onClick={() => {
              setMode("login");
              document
                .getElementById("auth-form")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-hero">
        <div className="section-py">
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              {/* Left — Headline */}
              <div className="hidden lg:block max-w-xl animate-in">
                <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-[52px] lg:leading-[1.1]">
                  Get paid every Monday
                  <br />
                  <span className="text-white/50">for your X activity.</span>
                </h1>
                <p className="mt-5 text-[17px] leading-relaxed text-white/60 max-w-md">
                  No minimum. No hidden fees. Complete tasks, submit a link, get paid weekly.
                </p>
                <div className="mt-8">
                  <button
                    onClick={() => {
                      setMode("signup");
                      document
                        .getElementById("auth-form")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3.5 text-[15px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] press"
                  >
                    Get Started
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>
                </div>
              </div>

              {/* Mobile headline */}
              <div className="lg:hidden text-center animate-in">
                <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                  Get paid every Monday{" "}
                  <span className="text-white/50">for your X activity.</span>
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-white/60">
                  No minimum. No hidden fees. Complete tasks, get paid weekly.
                </p>
              </div>

              {/* Auth Form */}
              <div id="auth-form" className="scroll-mt-20 animate-pop" style={{ animationDelay: '150ms' }}>
                <div className="rounded-2xl bg-white p-6 shadow-soft-xl">
                  <div className="mb-6">
                    <h2 className="text-lg font-bold tracking-tight text-foreground">
                      {mode === "login"
                        ? "Welcome back"
                        : "Create your account"}
                    </h2>
                    <p className="mt-1 text-[13px] text-muted">
                      {mode === "login"
                        ? "Sign in to continue earning"
                        : "Sign up with email to start earning"}
                    </p>
                  </div>

                  {/* Tab toggle */}
                  <div className="mb-5 flex rounded-xl bg-background p-1">
                    <button
                      onClick={() => {
                        setMode("login");
                        setError("");
                      }}
                      className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition-all ${
                        mode === "login"
                          ? "bg-foreground text-white shadow-soft-sm"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        setMode("signup");
                        setError("");
                      }}
                      className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition-all ${
                        mode === "signup"
                          ? "bg-foreground text-white shadow-soft-sm"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>

                  {/* Google Sign In */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white py-3 text-[14px] font-semibold transition-all hover:bg-card-hover active:scale-[0.98] disabled:opacity-50"
                  >
                    {googleLoading ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    Continue with Google
                  </button>

                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[12px] font-medium text-muted">or</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                    />
                    {mode === "signup" && (
                      <>
                        <input
                          type="password"
                          placeholder="Confirm password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                        />
                        <input
                          type="text"
                          placeholder="X username (e.g. @yourhandle)"
                          value={xUsername}
                          onChange={(e) => setXUsername(e.target.value)}
                          required
                          className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
                        />
                      </>
                    )}

                    {mode === "login" && (
                      <div className="text-right">
                        <Link
                          href="/forgot-password"
                          className="text-[12px] font-medium text-accent hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                    )}

                    {error && (
                      <p className="text-[13px] text-danger font-medium">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-accent py-3 text-[14px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          {mode === "login" ? "Signing in..." : "Creating account..."}
                        </span>
                      ) : mode === "login" ? (
                        "Sign In"
                      ) : (
                        "Create Account"
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-py bg-white">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-muted mb-8">
            From the community
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {testimonials.map((t, i) => (
              <div
                key={t.seed}
                className={`rounded-2xl border border-border bg-card p-5 shadow-soft-sm ${i % 2 === 0 ? "md:translate-y-6" : ""}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={`https://api.dicebear.com/9.x/notionists/svg?seed=${t.seed}`}
                    alt=""
                    width={40}
                    height={40}
                    className="rounded-full bg-background"
                  />
                  <div>
                    <p className="text-[14px] font-semibold">{t.name}</p>
                    <p className="text-[12px] text-muted">{t.handle}</p>
                  </div>
                  <span className="ml-auto rounded-full bg-accent-light px-2.5 py-1 text-[12px] font-bold tabular-nums text-accent">
                    {t.metric}
                  </span>
                </div>
                <p className="text-[14px] leading-relaxed text-muted">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Depay — asymmetric feature grid */}
      <section className="section-py bg-background">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Why Depay
          </h2>
          <p className="mt-2 text-[15px] text-muted max-w-lg">
            Built different from the usual engagement platforms.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-soft-sm">
              <h3 className="text-[17px] font-bold">Proof-based payouts</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                Every task requires a proof link. Admin reviews ensure no gaming, no bots. You do real work, you get real money.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft-sm">
              <h3 className="text-[17px] font-bold">No minimums</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                Every dollar is yours from day one. No withdrawal thresholds.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft-sm">
              <h3 className="text-[17px] font-bold">Weekly payouts</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                Calculated and paid every Monday at 00:00 UTC. Consistent and predictable.
              </p>
            </div>
            <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-soft-sm">
              <h3 className="text-[17px] font-bold">Transparent pricing</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                See exactly what each task pays before you start. No surprises, no fine print, no hidden deductions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compact CTA bar */}
      <section className="bg-hero">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <p className="text-[15px] font-medium text-white/80">
            Start earning from your X activity today.
          </p>
          <button
            onClick={() => {
              setMode("signup");
              document
                .getElementById("auth-form")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] press"
          >
            Sign Up
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <Image src="/Deepay_logo_option_1_ransparent.png" alt="Depay" width={28} height={28} className="rounded-lg" />
              <span className="text-[13px] text-muted">&copy; {new Date().getFullYear()} Depay. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4">
              {/* X (Twitter) */}
              <a href="https://x.com/depay" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-all hover:bg-foreground hover:text-white" aria-label="X (Twitter)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              {/* Medium */}
              <a href="https://medium.com/@depay" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-all hover:bg-foreground hover:text-white" aria-label="Medium">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" /></svg>
              </a>
              {/* GitHub */}
              <a href="https://github.com/depay" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-all hover:bg-foreground hover:text-white" aria-label="GitHub">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
