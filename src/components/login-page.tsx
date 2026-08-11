"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

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

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong");
        setLoading(false);
        return;
      }

      // If email verification is required, show the verification message
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

  if (verificationSent) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-muted">
            We sent a verification link to <strong>{email}</strong>. Click the link to activate your account.
          </p>
          <button
            onClick={() => {
              setVerificationSent(false);
              setMode("login");
            }}
            className="mt-6 text-sm font-medium text-accent hover:underline"
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <span className="text-sm font-bold text-white tracking-tight">
                D
              </span>
            </div>
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
      <section className="relative bg-hero overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative section-py">
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              {/* Left — Headline + CTA */}
              <div className="hidden lg:block max-w-xl animate-in">
                <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-[56px] lg:leading-[1.1]">
                  Engage on X.
                  <br />
                  <span className="text-white/50">Earn weekly.</span>
                </h1>
                <p className="mt-5 text-[17px] leading-relaxed text-white/60 lg:text-lg">
                  Complete simple engagement tasks — likes, retweets, follows, and
                  comments — and get paid every week. No minimum threshold, no
                  hidden fees.
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
                  Engage on X.{" "}
                  <span className="text-white/50">Earn weekly.</span>
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-white/60">
                  Complete engagement tasks and get paid every week.
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

      {/* How It Works */}
      <section className="section-py bg-white">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-[15px] text-muted">
            Three steps to start earning from your X engagement.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-3 stagger-children">
            {[
              { n: "1", title: "Sign up with email", desc: "Create your account in seconds. Add your X username so we can track your tasks." },
              { n: "2", title: "Complete tasks & submit proof", desc: "Like, retweet, follow, and comment on curated posts. Submit a link or screenshot as proof." },
              { n: "3", title: "Earn weekly payouts", desc: "Once your proof is approved, earnings count toward your weekly payout every Monday." },
            ].map((step) => (
              <div key={step.n} className="text-center group">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-xl font-bold text-white shadow-soft-md transition-transform duration-300 group-hover:scale-110 group-hover:shadow-soft-lg">
                  {step.n}
                </div>
                <h3 className="mt-5 text-[15px] font-semibold">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="section-py bg-white">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Built for earners
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-[15px] text-muted">
            Everything you need to earn consistently from your X engagement.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 stagger-children">
            {[
              { icon: <><path d="M9 12l2 2 4-4" /><path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9-9 9-9-1.8-9-9 1.8-9 9-9z" /></>, title: "Proof-based verification", desc: "Submit proof links or screenshots. Admin reviews ensure every task is genuinely completed.", bg: "bg-emerald-50", color: "text-emerald-600" },
              { icon: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>, title: "Weekly payouts", desc: "Earnings are calculated and paid out every Monday at 00:00 UTC. Consistent and reliable.", bg: "bg-blue-50", color: "text-blue-600" },
              { icon: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>, title: "No minimums", desc: "No minimum balance to withdraw. Every dollar you earn is yours from day one.", bg: "bg-amber-50", color: "text-amber-600" },
              { icon: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>, title: "Transparent earnings", desc: "See exactly how much each task pays before you start. No surprises, no fine print.", bg: "bg-slate-100", color: "text-slate-600" },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-white p-6 transition-all duration-300 hover:shadow-soft-md hover:-translate-y-1 hover-lift">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.bg}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={f.color}>
                    {f.icon}
                  </svg>
                </div>
                <h3 className="mt-4 text-[15px] font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-hero">
        <div className="section-py">
          <div className="mx-auto max-w-6xl px-5 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready to start earning?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] text-white/50">
              Sign up, complete tasks, and get paid weekly for your X engagement.
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
                Sign Up &amp; Start Earning
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
                <span className="text-xs font-bold text-white tracking-tight">D</span>
              </div>
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
