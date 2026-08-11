-- Migration v2: Crypto Payouts + Wallet Management
-- Run this migration after the initial schema is in place.

-- 1. Add wallet_address to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- 2. Add payout fields to weekly_payouts
ALTER TABLE weekly_payouts ADD COLUMN IF NOT EXISTS tx_hash TEXT;
ALTER TABLE weekly_payouts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE weekly_payouts ADD COLUMN IF NOT EXISTS paid_amount_usdc NUMERIC(18,6);

-- 3. Add category to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'engagement';

-- 4. Create payout_transactions table
CREATE TABLE IF NOT EXISTS payout_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES weekly_payouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  amount_usdc NUMERIC(18,6) NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'confirmed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_payout_transactions_payout_id ON payout_transactions(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_user_id ON payout_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_status ON payout_transactions(status);
CREATE INDEX IF NOT EXISTS idx_weekly_payouts_status ON weekly_payouts(status);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- 6. RLS policies for payout_transactions
ALTER TABLE payout_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage payout_transactions"
  ON payout_transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);
