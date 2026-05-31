-- Query paths for attendance analytics, calendar, and session history

create index if not exists training_days_user_trained_idx
  on public.training_days (user_id, trained_on desc);

create index if not exists workout_sessions_user_timestamp_idx
  on public.workout_sessions (user_id, timestamp desc);

create index if not exists workout_sets_session_logged_idx
  on public.workout_sets (session_id, logged_at);

-- Only set started_at on check-in when not already recorded
comment on index public.workout_sessions_user_timestamp_idx is 'Attendance + history fetch by user';
