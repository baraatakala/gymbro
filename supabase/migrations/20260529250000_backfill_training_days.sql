-- One-time backfill: training_days from existing workout_sessions.
INSERT INTO public.training_days (user_id, trained_on, sessions_count)
SELECT
  user_id,
  (to_timestamp(timestamp / 1000.0) AT TIME ZONE 'UTC')::date AS trained_on,
  count(*)::integer AS sessions_count
FROM public.workout_sessions
WHERE user_id IS NOT NULL
GROUP BY user_id, (to_timestamp(timestamp / 1000.0) AT TIME ZONE 'UTC')::date
ON CONFLICT (user_id, trained_on) DO UPDATE
  SET sessions_count = GREATEST(training_days.sessions_count, EXCLUDED.sessions_count);
