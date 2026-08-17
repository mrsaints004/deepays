-- Migration v7: Add increment_payout_total RPC function
-- Performs addition in SQL to avoid JS floating-point precision loss.
-- Uses optimistic locking (expected_total must match current value).

CREATE OR REPLACE FUNCTION public.increment_payout_total(
  payout_id UUID,
  amount NUMERIC,
  expected_total NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.weekly_payouts
  SET total_usd = total_usd + amount
  WHERE id = payout_id
    AND total_usd = expected_total;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Optimistic lock failed for payout %', payout_id;
  END IF;
END;
$$;
