-- Migration v3: Email auth + proof-based task verification + security hardening
-- Run after migration.sql and migration-v2.sql

-- Users: add auth_id + email, make x_id nullable
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE users ALTER COLUMN x_id DROP NOT NULL;
ALTER TABLE users ALTER COLUMN x_id SET DEFAULT NULL;

-- Completions: add proof + review fields
ALTER TABLE completions ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE completions ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
ALTER TABLE completions ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending_review'
  CHECK (review_status IN ('pending_review', 'approved', 'rejected'));
ALTER TABLE completions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE completions ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE completions ADD COLUMN IF NOT EXISTS reviewer_note TEXT;
CREATE INDEX IF NOT EXISTS idx_completions_review_status ON completions(review_status);

-- Mark existing completions as approved (honor-based legacy data)
UPDATE completions SET review_status = 'approved' WHERE review_status = 'pending_review';

-- Tasks: add participant limit
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT NULL;

-- Additional constraints and indexes
DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT tasks_reward_positive CHECK (reward_usd > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT tasks_max_participants_positive CHECK (max_participants IS NULL OR max_participants > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_weekly_payouts_status_week ON weekly_payouts(status, week_start);
CREATE INDEX IF NOT EXISTS idx_completions_review_created ON completions(review_status, created_at);

-- ============================================================
-- FIX: Replace overly permissive RLS policies
-- The original policies used `using (true)` which lets any
-- user (even unauthenticated with the anon key) read ALL rows.
-- These new policies scope data to the authenticated user.
-- ============================================================

-- Drop old permissive policies
DROP POLICY IF EXISTS "Anyone can view active tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own completions" ON public.completions;
DROP POLICY IF EXISTS "Users can insert own completions" ON public.completions;
DROP POLICY IF EXISTS "Users can view own payouts" ON public.weekly_payouts;
DROP POLICY IF EXISTS "Service role can manage payout_transactions" ON payout_transactions;

-- TASKS: anyone authenticated can view active tasks (tasks are public content)
CREATE POLICY "Authenticated users can view active tasks"
  ON public.tasks
  FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'active');

-- Allow service role full access to tasks (for admin routes and cron)
CREATE POLICY "Service role full access to tasks"
  ON public.tasks
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- USERS: users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = auth_id);

-- Users can update their own profile (for wallet address)
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Service role full access to users (for admin, signup, cron)
CREATE POLICY "Service role full access to users"
  ON public.users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- COMPLETIONS: users can only see their own completions
CREATE POLICY "Users can view own completions"
  ON public.completions
  FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Users can only insert completions for themselves
CREATE POLICY "Users can insert own completions"
  ON public.completions
  FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Service role full access to completions (for admin reviews, cron)
CREATE POLICY "Service role full access to completions"
  ON public.completions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- WEEKLY PAYOUTS: users can only see their own payouts
CREATE POLICY "Users can view own payouts"
  ON public.weekly_payouts
  FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Service role full access to weekly_payouts (for admin, cron, reviews)
CREATE POLICY "Service role full access to weekly_payouts"
  ON public.weekly_payouts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- PAYOUT TRANSACTIONS: users can only see their own transactions
CREATE POLICY "Users can view own payout transactions"
  ON payout_transactions
  FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Service role full access to payout_transactions (for admin, cron)
CREATE POLICY "Service role full access to payout_transactions"
  ON payout_transactions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
