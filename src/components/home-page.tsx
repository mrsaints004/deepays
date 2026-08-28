"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { formatUSD } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────
   Scroll-reveal hook — adds "visible" class when element
   enters viewport
   ──────────────────────────────────────────────────────────── */

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            // Also reveal children with reveal classes
            entry.target.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale").forEach((child) => {
              child.classList.add("visible");
            });
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    // Observe the container and all reveal children
    observer.observe(el);
    el.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale").forEach((child) => {
      observer.observe(child);
    });

    return () => observer.disconnect();
  }, []);

  return ref;
}

function RevealSection({ children, className = "", as: Tag = "section" }: { children: React.ReactNode; className?: string; as?: "section" | "div" }) {
  const ref = useScrollReveal();
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/* ────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────── */

interface PublicTask {
  id: string;
  title: string;
  description: string;
  action_url: string;
  reward_usd: number;
  category: string;
  status: string;
  max_participants: number | null;
  created_at: string;
  expires_at: string | null;
}

interface CompletedTask {
  id: string;
  title: string;
  description: string;
  action_url: string;
  reward_usd: number;
  category: string;
  status: string;
  max_participants: number | null;
  created_at: string;
  expires_at: string | null;
}

interface HomePageProps {
  user: { id: string; email: string | null; x_username: string } | null;
  currentTasks: PublicTask[];
  completedTasks?: CompletedTask[];
  completedParticipantCounts?: Record<string, number>;
}

/* ────────────────────────────────────────────────────────────
   Past projects — hardcoded X links
   ──────────────────────────────────────────────────────────── */

const pastProjects = [
  {
    project: "VIZO Exchange",
    handle: "@vizoexchange",
    avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Vizo",
    profileUrl: "https://x.com/vizoexchange",
    tasks: [
      { label: "Campaign 1", url: "https://x.com/vizoexchange/status/2084190488748580917", milestone: "50/50" },
      { label: "Campaign 2", url: "https://x.com/vizoexchange/status/2083769750660997365", milestone: "50/50" },
      { label: "Campaign 3", url: "https://x.com/akedofun/status/2079800414099419200", milestone: "100/100" },
    ],
  },
  {
    project: "AKEDO",
    handle: "@akedofun",
    avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Akedo",
    profileUrl: "https://x.com/akedofun",
    tasks: [
      { label: "Campaign 1", url: "https://x.com/akedofun/status/2085008500070216164", milestone: "200/200" },
      { label: "Campaign 2", url: "https://x.com/akedofun/status/2087064492886868219", milestone: "202/202" },
    ],
  },
  {
    project: "AXIS Robotics",
    handle: "@axisrobotics",
    avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Axis",
    profileUrl: "https://x.com/axisrobotics",
    tasks: [
      { label: "Campaign 1", url: "https://x.com/axisrobotics/status/2091797746114244876", milestone: "100/100" },
      { label: "Campaign 2", url: "https://x.com/axisrobotics/status/2087746680242503912", milestone: "150/150" },
    ],
  },
];

const testimonials = [
  {
    name: "David",
    handle: "Growth Lead, Agentic Ai",
    quote: "Deepays gave us a real edge for our launch. The engagement was authentic and measurable — exactly what we needed to build momentum for AKEDO.",
    metric: "AKEDO",
    seed: "David",
    link: "https://x.com/akedofun",
  },
  {
    name: "Lily",
    handle: "Head of Growth, VIZO",
    quote: "We switched to Deepays and saw immediate results. Real users, real interactions — our community growth has been consistent and sustainable.",
    metric: "VIZO",
    seed: "Lily",
    link: "https://x.com/vizoexchange",
  },
  {
    name: "Jack",
    handle: "Growth Manager, AXIS",
    quote: "Deepays\u2019s proof-based system ensures every engagement is genuine. It\u2019s been a key part of our growth strategy at AXIS Robotics.",
    metric: "AXIS",
    seed: "Jack",
    link: "https://x.com/axisrobotics",
  },
];

const stats = [
  { value: "1.6K+", label: "Tasks Completed" },
  { value: "$17K+", label: "Paid to Users" },
  { value: "600+", label: "Active Earners" },
  { value: "100%", label: "Payout Rate" },
];

/* ────────────────────────────────────────────────────────────
   Icons (inline SVGs)
   ──────────────────────────────────────────────────────────── */

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function RetweetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7" /><path d="M7 7h10v10" /></svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  );
}

function ZapIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>
  );
}

function DollarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
  );
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
  );
}

function EyeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  );
}

function UsersIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  );
}

/* ────────────────────────────────────────────────────────────
   Engagement action buttons for a tweet
   ──────────────────────────────────────────────────────────── */

function TweetActions({ tweetUrl, profileUrl }: { tweetUrl: string; profileUrl: string }) {
  const tweetId = tweetUrl.split("/status/")[1]?.split("?")[0] ?? "";
  const username = profileUrl.split("x.com/")[1]?.split("/")[0] ?? "";

  const btnClass = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 hover:text-foreground transition-colors";

  return (
    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
      <a href={`https://x.com/intent/follow?screen_name=${username}`} target="_blank" rel="noopener noreferrer" className={btnClass}>
        <UserPlusIcon /> Follow
      </a>
      <a href={`https://x.com/intent/retweet?tweet_id=${tweetId}`} target="_blank" rel="noopener noreferrer" className={btnClass}>
        <RetweetIcon /> Retweet
      </a>
      <a href={`https://x.com/intent/like?tweet_id=${tweetId}`} target="_blank" rel="noopener noreferrer" className={btnClass}>
        <HeartIcon /> Like
      </a>
      <a href={`https://x.com/intent/tweet?in_reply_to=${tweetId}`} target="_blank" rel="noopener noreferrer" className={btnClass}>
        <CommentIcon /> Comment
      </a>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Category badge helpers
   ──────────────────────────────────────────────────────────── */

const categoryConfig: Record<string, { dot: string; text: string; bg: string }> = {
  engagement: { dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
  follow: { dot: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50" },
  content: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  other: { dot: "bg-neutral-400", text: "text-neutral-600", bg: "bg-neutral-50" },
};

/* ────────────────────────────────────────────────────────────
   HomePage Component
   ──────────────────────────────────────────────────────────── */

export function HomePage({ user, currentTasks, completedTasks = [], completedParticipantCounts = {} }: HomePageProps) {
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
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Show error messages from OAuth callback redirects (e.g. /?error=auth_failed)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");
    if (authError) {
      const errorMessages: Record<string, string> = {
        auth_failed: "Sign-in failed. Please try again.",
        missing_code: "Sign-in was interrupted. Please try again.",
        reset_failed: "Password reset failed. Please request a new link.",
      };
      setError(errorMessages[authError] || "Something went wrong. Please try again.");
      // Clean URL without reloading
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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

      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body = mode === "login" ? { email, password } : { email, password, x_username: xUsername };

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

  function handleTaskAction(actionUrl: string) {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    window.open(actionUrl, "_blank");
  }

  /* ── OTP verification screen ── */
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
            {error && <p className="text-[13px] text-danger font-medium">{error}</p>}
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
              ) : "Verify"}
            </button>
            <button onClick={handleResendOtp} disabled={resending} className="text-sm font-medium text-accent hover:underline disabled:opacity-50">
              {resending ? "Resending..." : "Resend code"}
            </button>
          </div>
          <button
            onClick={() => { setVerificationSent(false); setOtpCode(""); setError(""); setMode("login"); }}
            className="mt-4 text-sm font-medium text-muted hover:text-foreground"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  /* ── Auth form (shared between modal and inline) ── */
  const authForm = (
    <div className="w-full">
      <div className="mb-5">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          {mode === "login" ? "Sign in to start earning" : "Sign up to start earning from X"}
        </p>
      </div>

      {/* Tab toggle */}
      <div className="mb-4 flex rounded-xl bg-neutral-50 p-1">
        <button
          onClick={() => { setMode("login"); setError(""); }}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition-all ${mode === "login" ? "bg-foreground text-white shadow-soft-sm" : "text-muted hover:text-foreground"}`}
        >
          Sign In
        </button>
        <button
          onClick={() => { setMode("signup"); setError(""); }}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition-all ${mode === "signup" ? "bg-foreground text-white shadow-soft-sm" : "text-muted hover:text-foreground"}`}
        >
          Sign Up
        </button>
      </div>

      {/* Google */}
      <button
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="mb-3 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white py-3 text-[14px] font-semibold transition-all hover:bg-card-hover active:scale-[0.98] disabled:opacity-50"
      >
        {googleLoading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        Continue with Google
      </button>

      <div className="mb-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium text-muted uppercase tracking-wider">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
          className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
          className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20" />
        {mode === "signup" && (
          <>
            <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6}
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20" />
            <input type="text" placeholder="X username (e.g. @yourhandle)" value={xUsername} onChange={(e) => setXUsername(e.target.value)} required
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20" />
          </>
        )}
        {mode === "login" && (
          <div className="text-right">
            <Link href="/forgot-password" className="text-[12px] font-medium text-accent hover:underline">Forgot password?</Link>
          </div>
        )}
        {error && <p className="text-[13px] text-danger font-medium">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-accent py-3 text-[14px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {mode === "login" ? "Signing in..." : "Creating account..."}
            </span>
          ) : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      {/* ── Auth Modal Overlay ── */}
      {showAuthModal && !user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft-xl animate-scale-in">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-neutral-100 hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-light">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
              </div>
              <p className="text-[13px] text-muted">Sign in to complete tasks and earn rewards</p>
            </div>
            {authForm}
          </div>
        </div>
      )}

      {/* ── Sticky Navbar ── */}
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <Image src="/Deepay_logo_option_1_ransparent.png" alt="Deepays" width={36} height={36} className="rounded-xl" />
            <span className="text-[17px] font-bold tracking-tight text-foreground">Deepays</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#tasks" className="text-[13px] font-medium text-muted hover:text-foreground transition-colors">Tasks</a>
            <a href="#past-campaigns" className="text-[13px] font-medium text-muted hover:text-foreground transition-colors">Past Campaigns</a>
            <a href="#how-it-works" className="text-[13px] font-medium text-muted hover:text-foreground transition-colors">How It Works</a>
            <a href="#testimonials" className="text-[13px] font-medium text-muted hover:text-foreground transition-colors">Reviews</a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/earn"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  Dashboard <ArrowIcon />
                </Link>
              </div>
            ) : (
              <>
                <button
                  onClick={() => { setMode("login"); setShowAuthModal(true); }}
                  className="hidden sm:inline-flex text-[13px] font-semibold text-foreground hover:text-accent transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMode("signup"); setShowAuthModal(true); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-hero">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="relative section-py">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mx-auto max-w-3xl text-center animate-in">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 mb-8">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[12px] font-semibold text-white/70 tracking-wide uppercase">Paying out every Monday</span>
              </div>

              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Get paid for your{" "}
                <span className="relative">
                  <span className="relative z-10 text-shimmer">X activity</span>
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-white/60">
                Complete engagement tasks, submit proof, and earn weekly USDC payouts. No minimums, no hidden fees, no bots.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                {user ? (
                  <Link
                    href="/earn"
                    className="inline-flex items-center gap-2 rounded-2xl bg-accent px-8 py-4 text-[15px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] press shadow-soft-lg"
                  >
                    Go to Dashboard <ArrowIcon />
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => { setMode("signup"); setShowAuthModal(true); }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-accent px-8 py-4 text-[15px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] press shadow-soft-lg"
                    >
                      Start Earning <ArrowIcon />
                    </button>
                    <a
                      href="#tasks"
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-[15px] font-semibold text-white/80 transition-all hover:bg-white/10 active:scale-[0.98]"
                    >
                      View Tasks
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Stats bar */}
            <div className="mt-16 mx-auto max-w-3xl animate-pop" style={{ animationDelay: "200ms" }}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4 text-center backdrop-blur-sm">
                    <p className="text-2xl font-extrabold text-white sm:text-3xl">{s.value}</p>
                    <p className="mt-1 text-[12px] font-medium text-white/50">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Current Tasks Section ── */}
      <RevealSection className="section-py bg-neutral-50 scroll-mt-16" as="section">
        <div id="tasks" className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 reveal">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-accent-light px-3 py-1 mb-3">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-[11px] font-bold text-accent uppercase tracking-wider">Live Now</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Current Tasks</h2>
              <p className="mt-1.5 text-[15px] text-muted max-w-md">
                Complete these tasks to earn rewards.{" "}
                {!user && <span className="text-accent font-medium">Sign in to submit proof and get paid.</span>}
              </p>
            </div>
            {user && (
              <Link
                href="/earn"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-[13px] font-semibold text-foreground shadow-soft-sm hover:shadow-soft-md transition-all"
              >
                View All in Dashboard <ArrowIcon />
              </Link>
            )}
          </div>

          {currentTasks.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {currentTasks.map((task) => {
                const cat = task.category || "engagement";
                const cc = categoryConfig[cat] || categoryConfig.other;
                return (
                  <div
                    key={task.id}
                    className="group relative rounded-2xl border border-border bg-white p-5 shadow-soft-sm transition-all duration-300 hover:shadow-soft-md hover:-translate-y-0.5"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cc.bg} ${cc.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cc.dot}`} />
                            {cat}
                          </span>
                          {task.max_participants != null && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted">
                              <UsersIcon /> Limited spots
                            </span>
                          )}
                        </div>
                        <h3 className="text-[15px] font-semibold leading-snug text-foreground group-hover:text-accent transition-colors">
                          {task.title}
                        </h3>
                      </div>
                      <div className="flex-shrink-0 rounded-xl bg-accent px-3 py-1.5">
                        <span className="text-sm font-bold tabular-nums text-white">{formatUSD(task.reward_usd)}</span>
                      </div>
                    </div>

                    <p className="text-[13px] leading-relaxed text-muted mb-4">{task.description}</p>

                    {/* Action */}
                    <div className="flex items-center gap-2">
                      {user ? (
                        <a
                          href={task.action_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                        >
                          <XIcon className="w-3.5 h-3.5" /> Go to X <ExternalIcon />
                        </a>
                      ) : (
                        <button
                          onClick={() => handleTaskAction(task.action_url)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                        >
                          <XIcon className="w-3.5 h-3.5" /> Sign in to Start <ExternalIcon />
                        </button>
                      )}
                      <Link
                        href={user ? "/earn" : "#"}
                        onClick={(e) => { if (!user) { e.preventDefault(); setShowAuthModal(true); } }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-[13px] font-semibold text-muted hover:text-foreground hover:border-foreground transition-all"
                      >
                        Submit Proof
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white py-16 text-center shadow-soft-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-light mb-4">
                <ZapIcon />
              </div>
              <p className="text-[15px] font-semibold">No active tasks right now</p>
              <p className="mt-1 text-[13px] text-muted">New tasks are added regularly. Check back soon.</p>
            </div>
          )}
        </div>
      </RevealSection>

      {/* ── Past Campaigns Section ── */}
      <RevealSection className="section-py bg-white scroll-mt-16" as="section">
        <div id="past-campaigns" className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-8 reveal">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">Completed Campaigns</p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Past Tasks</h2>
            <p className="mt-1.5 text-[15px] text-muted max-w-lg">
              Projects that have successfully run engagement campaigns through Deepays. Engage with these posts to support the community.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Dynamic completed campaigns from DB — newest first */}
            {completedTasks.map((task, i) => {
              const cat = task.category || "engagement";
              const cc = categoryConfig[cat] || categoryConfig.other;
              const participants = completedParticipantCounts[task.id] ?? 0;
              const isFull = task.max_participants != null && participants >= task.max_participants;
              // Extract handle from action_url if it's a twitter/x link
              const actionHost = (() => { try { return new URL(task.action_url).hostname; } catch { return ""; } })();
              const isXLink = ["twitter.com", "x.com", "www.twitter.com", "www.x.com"].includes(actionHost);
              const tweetId = isXLink ? task.action_url.split("/status/")[1]?.split("?")[0] : null;

              return (
                <div
                  key={task.id}
                  className={`reveal-scale ${i < 6 ? `reveal-delay-${(i % 3) + 1}` : ""} rounded-2xl border border-border bg-card p-5 shadow-soft-sm hover:shadow-soft-md transition-all duration-300`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cc.bg} ${cc.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cc.dot}`} />
                          {cat}
                        </span>
                        {isFull && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 tabular-nums">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            {participants}/{task.max_participants}
                          </span>
                        )}
                        {!isFull && participants > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted">
                            <UsersIcon /> {participants} completed
                          </span>
                        )}
                      </div>
                      <h3 className="text-[15px] font-semibold leading-snug text-foreground">{task.title}</h3>
                    </div>
                    <div className="flex-shrink-0 rounded-xl bg-neutral-100 border border-neutral-200 px-3 py-1.5">
                      <span className="text-sm font-bold tabular-nums text-muted">{formatUSD(task.reward_usd)}</span>
                    </div>
                  </div>

                  <p className="text-[13px] leading-relaxed text-muted mb-4 line-clamp-2">{task.description}</p>

                  {/* Engagement actions for X posts */}
                  {isXLink && tweetId && (
                    <div className="mb-3">
                      <TweetActions tweetUrl={task.action_url} profileUrl={task.action_url.split("/status/")[0] || task.action_url} />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                      <CheckIcon /> Completed
                    </span>
                    <a
                      href={task.action_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                    >
                      View Post <ExternalIcon />
                    </a>
                  </div>
                </div>
              );
            })}

            {/* Legacy hardcoded campaigns — always shown at the bottom */}
            {pastProjects.map((project, pi) => (
              <div key={project.handle} className={`reveal-scale reveal-delay-${(pi % 3) + 1} rounded-2xl border border-border bg-card p-5 shadow-soft-sm hover:shadow-soft-md transition-all duration-300`}>
                {/* Project header */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                  <img
                    src={project.avatar}
                    alt={project.project}
                    width={44}
                    height={44}
                    className="rounded-full bg-neutral-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold truncate">{project.project}</p>
                    <a
                      href={project.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-medium text-accent hover:underline"
                    >
                      {project.handle}
                    </a>
                  </div>
                  <a
                    href={`https://x.com/intent/follow?screen_name=${project.handle.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    <UserPlusIcon /> Follow
                  </a>
                </div>

                {/* Task posts */}
                <div className="space-y-3">
                  {project.tasks.map((task, i) => (
                    <div key={i} className="rounded-xl bg-neutral-50 p-3 border border-neutral-100">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-foreground">{task.label}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 tabular-nums">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            {task.milestone}
                          </span>
                        </div>
                        <a
                          href={task.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                        >
                          View Post <ExternalIcon />
                        </a>
                      </div>
                      <TweetActions tweetUrl={task.url} profileUrl={project.profileUrl} />
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-border">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-[11px] font-semibold text-green-700">
                    <CheckIcon /> Campaign Completed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ── How It Works ── */}
      <RevealSection className="section-py bg-neutral-50 scroll-mt-16" as="section">
        <div id="how-it-works" className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center mb-12 reveal">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How It Works</h2>
            <p className="mt-2 text-[15px] text-muted max-w-md mx-auto">
              Three simple steps to start earning from your social media activity.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Pick a task",
                desc: "Browse available engagement tasks from real projects. Each task clearly shows what to do and how much it pays.",
                icon: <EyeIcon />,
              },
              {
                step: "02",
                title: "Complete & submit proof",
                desc: "Perform the action on X, then paste your link or upload a screenshot as proof. It takes less than a minute.",
                icon: <ShieldIcon />,
              },
              {
                step: "03",
                title: "Get paid every Monday",
                desc: "Admin reviews your proof. Approved tasks add to your weekly earnings, paid out in USDC every Monday at 00:00 UTC.",
                icon: <DollarIcon />,
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`reveal reveal-delay-${i + 1} relative rounded-2xl border border-border bg-white p-6 shadow-soft-sm hover:shadow-soft-md transition-all duration-300`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-light text-accent">
                    {item.icon}
                  </div>
                  <span className="text-[11px] font-bold text-accent tracking-wider uppercase">Step {item.step}</span>
                </div>
                <h3 className="text-[17px] font-bold mb-2">{item.title}</h3>
                <p className="text-[14px] leading-relaxed text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ── Why Deepays — Feature grid ── */}
      <RevealSection className="section-py bg-white" as="section">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center mb-12 reveal">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Why Deepays</h2>
            <p className="mt-2 text-[15px] text-muted max-w-md mx-auto">
              Built different from the usual engagement platforms.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="reveal reveal-delay-1 md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-soft-sm hover:shadow-soft-md transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent"><ShieldIcon /></div>
                <h3 className="text-[17px] font-bold">Proof-based payouts</h3>
              </div>
              <p className="text-[14px] leading-relaxed text-muted">
                Every task requires a proof link. Admin reviews ensure no gaming, no bots. You do real work, you get real money.
              </p>
            </div>
            <div className="reveal reveal-delay-2 rounded-2xl border border-border bg-card p-6 shadow-soft-sm hover:shadow-soft-md transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent"><DollarIcon /></div>
                <h3 className="text-[17px] font-bold">No minimums</h3>
              </div>
              <p className="text-[14px] leading-relaxed text-muted">
                Every dollar is yours from day one. No withdrawal thresholds or hidden deductions.
              </p>
            </div>
            <div className="reveal reveal-delay-3 rounded-2xl border border-border bg-card p-6 shadow-soft-sm hover:shadow-soft-md transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent"><ClockIcon /></div>
                <h3 className="text-[17px] font-bold">Weekly payouts</h3>
              </div>
              <p className="text-[14px] leading-relaxed text-muted">
                Calculated and paid every Monday at 00:00 UTC. Consistent, predictable, reliable.
              </p>
            </div>
            <div className="reveal reveal-delay-4 md:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-soft-sm hover:shadow-soft-md transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent"><EyeIcon /></div>
                <h3 className="text-[17px] font-bold">Transparent pricing</h3>
              </div>
              <p className="text-[14px] leading-relaxed text-muted">
                See exactly what each task pays before you start. No surprises, no fine print, no hidden deductions.
              </p>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ── Testimonials ── */}
      <RevealSection className="section-py bg-neutral-50 scroll-mt-16" as="section">
        <div id="testimonials" className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center mb-10 reveal">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">From the community</p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Trusted by Projects</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={t.seed} className={`reveal reveal-delay-${i + 1} rounded-2xl border border-border bg-white p-6 shadow-soft-sm hover:shadow-soft-md transition-all duration-300`}>
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={`https://api.dicebear.com/9.x/notionists/svg?seed=${t.seed}`}
                    alt=""
                    width={44}
                    height={44}
                    className="rounded-full bg-neutral-100"
                  />
                  <div className="flex-1">
                    <p className="text-[14px] font-bold">{t.name}</p>
                    <p className="text-[12px] text-muted">{t.handle}</p>
                  </div>
                  <a
                    href={t.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-accent-light px-3 py-1 text-[12px] font-bold tabular-nums text-accent hover:bg-accent hover:text-white transition-colors"
                  >
                    {t.metric}
                  </a>
                </div>
                <p className="text-[14px] leading-relaxed text-muted">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ── CTA Section ── */}
      <section className="relative overflow-hidden bg-hero">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to start earning?
            </h2>
            <p className="mt-4 text-[16px] text-white/60 max-w-md mx-auto">
              Join thousands of users earning weekly from their X activity. No minimum payout, no hidden fees.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {user ? (
                <Link
                  href="/earn"
                  className="inline-flex items-center gap-2 rounded-2xl bg-accent px-8 py-4 text-[15px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] press shadow-soft-lg"
                >
                  Go to Dashboard <ArrowIcon />
                </Link>
              ) : (
                <button
                  onClick={() => { setMode("signup"); setShowAuthModal(true); }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-accent px-8 py-4 text-[15px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] press shadow-soft-lg"
                >
                  Create Free Account <ArrowIcon />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <Image src="/Deepay_logo_option_1_ransparent.png" alt="Deepays" width={32} height={32} className="rounded-xl" />
                <span className="text-[15px] font-bold tracking-tight">Deepays</span>
              </div>
              <p className="text-[13px] text-muted leading-relaxed max-w-sm">
                The engagement platform that pays. Complete tasks on X, submit proof, and earn weekly USDC rewards.
              </p>
            </div>

            {/* Quick links */}
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-muted mb-3">Platform</p>
              <ul className="space-y-2">
                <li><a href="#tasks" className="text-[13px] text-muted hover:text-foreground transition-colors">Current Tasks</a></li>
                <li><a href="#past-campaigns" className="text-[13px] text-muted hover:text-foreground transition-colors">Past Campaigns</a></li>
                <li><a href="#how-it-works" className="text-[13px] text-muted hover:text-foreground transition-colors">How It Works</a></li>
                <li><a href="#testimonials" className="text-[13px] text-muted hover:text-foreground transition-colors">Reviews</a></li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-muted mb-3">Connect</p>
              <div className="flex items-center gap-2">
                <a href="https://x.com/depaboraEji" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted transition-all hover:bg-foreground hover:text-white hover:border-foreground" aria-label="X (Twitter)">
                  <XIcon />
                </a>
                <a href="https://medium.com/@depay" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted transition-all hover:bg-foreground hover:text-white hover:border-foreground" aria-label="Medium">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" /></svg>
                </a>
                <a href="https://github.com/depay" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted transition-all hover:bg-foreground hover:text-white hover:border-foreground" aria-label="GitHub">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" /></svg>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-muted">&copy; {new Date().getFullYear()} Deepays. All rights reserved.</p>
            <p className="text-[12px] text-muted">Payouts in USDC on Base</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
