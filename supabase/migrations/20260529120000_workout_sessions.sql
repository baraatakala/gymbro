-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  storage_key text unique not null,
  day text not null,
  timestamp bigint not null,
  save_time text,
  save_date text,
  exercises jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_day_timestamp_idx
  on public.workout_sessions (day, timestamp desc);

alter table public.workout_sessions enable row level security;

create policy "workout_sessions_select"
  on public.workout_sessions for select
  using (true);

create policy "workout_sessions_insert"
  on public.workout_sessions for insert
  with check (true);

create policy "workout_sessions_update"
  on public.workout_sessions for update
  using (true);

create policy "workout_sessions_delete"
  on public.workout_sessions for delete
  using (true);
