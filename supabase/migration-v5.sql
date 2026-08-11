-- Migration v5: Production readiness fixes
-- Run after migration-v4.sql

-- ============================================================
-- FIX: weekly_payouts CHECK constraint missing 'processing' status
-- The payout flow sets status to 'processing' but the constraint only allows 'pending' and 'paid'
-- ============================================================
ALTER TABLE weekly_payouts DROP CONSTRAINT IF EXISTS weekly_payouts_status_check;
ALTER TABLE weekly_payouts ADD CONSTRAINT weekly_payouts_status_check
  CHECK (status IN ('pending', 'processing', 'paid'));

-- ============================================================
-- ADD: updated_at timestamps on mutable tables
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE weekly_payouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_tasks
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_weekly_payouts
    BEFORE UPDATE ON weekly_payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
