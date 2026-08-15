-- v6: Add index on completions.review_status for admin reviews page performance
CREATE INDEX IF NOT EXISTS idx_completions_review_status
  ON completions (review_status, completed_at DESC);
