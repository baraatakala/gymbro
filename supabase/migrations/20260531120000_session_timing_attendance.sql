-- Gym attendance analytics: check-in / check-out on sessions
alter table public.workout_sessions
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz,
  add column if not exists status text default 'in_progress';

comment on column public.workout_sessions.started_at is 'Check-in when user opens section or first activity';
comment on column public.workout_sessions.finished_at is 'Check-out when user taps Finish workout';
