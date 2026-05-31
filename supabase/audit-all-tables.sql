-- ============================================================
-- GymBro — full table audit (Supabase Dashboard → SQL → Run)
-- Project: trail (ref: nyrtsmzxdtyboxeqdluk)
-- ============================================================

-- 1) All public tables
SELECT tablename, pg_size_pretty(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2) Row counts (bypasses RLS — service role / SQL editor)
SELECT 'workout_days' AS table_name, count(*) FROM public.workout_days
UNION ALL SELECT 'workout_day_exercises', count(*) FROM public.workout_day_exercises
UNION ALL SELECT 'exercises', count(*) FROM public.exercises
UNION ALL SELECT 'muscle_groups', count(*) FROM public.muscle_groups
UNION ALL SELECT 'workout_sessions', count(*) FROM public.workout_sessions
UNION ALL SELECT 'workout_sets', count(*) FROM public.workout_sets
UNION ALL SELECT 'personal_records', count(*) FROM public.personal_records
UNION ALL SELECT 'custom_exercises', count(*) FROM public.custom_exercises
UNION ALL SELECT 'training_days', count(*) FROM public.training_days
ORDER BY table_name;

-- 2b) Volume integrity (stored vs sets)
SELECT ws.id, ws.day, ws.total_volume_kg AS stored,
  coalesce(sum(ws2.weight_kg * ws2.reps), 0) AS calculated
FROM public.workout_sessions ws
LEFT JOIN public.workout_sets ws2 ON ws2.session_id = ws.id
GROUP BY ws.id, ws.day, ws.total_volume_kg;

-- 3) Users with plans
SELECT user_id, count(*) AS sections
FROM public.workout_days
GROUP BY user_id
ORDER BY sections DESC;

-- 4) Back section plan + exercises
SELECT d.id AS day_id, d.name, d.user_id, e.name AS exercise, e.sort_order
FROM public.workout_days d
LEFT JOIN public.workout_day_exercises e ON e.day_id = d.id
WHERE d.name = 'Back'
ORDER BY d.user_id, e.sort_order;

-- 5) Sessions per section (all users)
SELECT day, count(*) AS session_rows,
       count(DISTINCT user_id) AS users,
       max(to_timestamp(timestamp / 1000.0)) AS latest
FROM public.workout_sessions
GROUP BY day
ORDER BY session_rows DESC;

-- 6) Back sessions detail
SELECT id, user_id, day, timestamp, save_date, save_time,
       jsonb_object_keys(exercises) AS exercise_keys
FROM public.workout_sessions
WHERE day = 'Back'
ORDER BY timestamp DESC
LIMIT 20;

-- 7) Personal records (matches sidebar PR count)
SELECT user_id, exercise_name, weight_kg, reps, achieved_at
FROM public.personal_records
ORDER BY achieved_at DESC;

-- 8) Orphan sessions (user_id null — legacy)
SELECT count(*) AS orphan_sessions FROM public.workout_sessions WHERE user_id IS NULL;

-- 9) Sets linked to sessions
SELECT s.day, count(ws.id) AS set_rows
FROM public.workout_sets ws
JOIN public.workout_sessions s ON s.id = ws.session_id
GROUP BY s.day
ORDER BY set_rows DESC;
