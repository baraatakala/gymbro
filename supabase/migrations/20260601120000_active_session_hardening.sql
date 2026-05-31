-- One in_progress session per user, auto-close after 6h, RPC on app load
-- status enum: in_progress | completed | cancelled

-- Backfill: close sessions left open > 6 hours
UPDATE public.workout_sessions
SET
  status = 'completed',
  finished_at = LEAST(
    now(),
    COALESCE(started_at, to_timestamp(timestamp / 1000.0)) + interval '6 hours'
  )
WHERE status = 'in_progress'
  AND finished_at IS NULL
  AND COALESCE(started_at, to_timestamp(timestamp / 1000.0)) < now() - interval '6 hours';

-- Keep newest open row per user before unique index
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timestamp DESC) AS rn
  FROM public.workout_sessions
  WHERE status = 'in_progress' AND finished_at IS NULL
)
UPDATE public.workout_sessions ws
SET status = 'completed', finished_at = COALESCE(ws.finished_at, now())
FROM ranked r
WHERE ws.id = r.id AND r.rn > 1;

-- At most one open session per user (blocks double check-in)
CREATE UNIQUE INDEX IF NOT EXISTS workout_sessions_one_active_per_user
  ON public.workout_sessions (user_id)
  WHERE (status = 'in_progress' AND finished_at IS NULL);

CREATE OR REPLACE FUNCTION public.auto_close_stale_workout_sessions(p_max_hours numeric DEFAULT 6)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.workout_sessions
  SET
    status = 'completed',
    finished_at = LEAST(
      now(),
      COALESCE(started_at, to_timestamp(timestamp / 1000.0)) + (p_max_hours || ' hours')::interval
    )
  WHERE user_id = uid
    AND status = 'in_progress'
    AND finished_at IS NULL
    AND COALESCE(started_at, to_timestamp(timestamp / 1000.0))
      < now() - (p_max_hours || ' hours')::interval;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_close_stale_workout_sessions(numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_close_stale_workout_sessions(numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.auto_close_stale_workout_sessions(numeric) TO authenticated;
