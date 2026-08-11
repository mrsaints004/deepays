-- Migration v4: Production hardening — audit logs, cron locks, rate limiting
-- Run after migration-v3.sql

-- ============================================================
-- AUDIT LOGS: track all admin actions for compliance
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);

-- Service role only access to audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to audit_logs"
  ON audit_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- CRON LOCKS: prevent concurrent cron job execution
-- ============================================================
CREATE TABLE IF NOT EXISTS cron_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_active_job UNIQUE (job_name)
);

-- Auto-expire locks older than 5 minutes (in case of crash)
-- This will be checked by the cron job itself
CREATE INDEX IF NOT EXISTS idx_cron_locks_job ON cron_locks(job_name);

ALTER TABLE cron_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to cron_locks"
  ON cron_locks
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- RATE LIMITING: Supabase-backed rate limit store
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to rate_limits"
  ON rate_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Function to check and increment rate limit atomically
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_ms INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_record rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_reset_at TIMESTAMPTZ := v_now + (p_window_ms || ' milliseconds')::INTERVAL;
BEGIN
  -- Try to get existing record
  SELECT * INTO v_record FROM rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    -- First request — insert new record
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_reset_at)
    ON CONFLICT (key) DO UPDATE SET count = 1, reset_at = v_reset_at;
    RETURN FALSE; -- not limited
  END IF;

  IF v_now > v_record.reset_at THEN
    -- Window expired — reset
    UPDATE rate_limits SET count = 1, reset_at = v_reset_at WHERE key = p_key;
    RETURN FALSE;
  END IF;

  IF v_record.count >= p_max_requests THEN
    RETURN TRUE; -- rate limited
  END IF;

  -- Increment count
  UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Periodic cleanup of expired rate limit records (run via cron or manually)
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE reset_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Periodic cleanup of stale cron locks (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_cron_locks() RETURNS void AS $$
BEGIN
  DELETE FROM cron_locks WHERE started_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- NOTIFICATIONS: fallback email queue when no SMTP provider
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_email ON notifications(email);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to notifications"
  ON notifications
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
