-- ============================================================
-- GymBro — run this in Supabase Dashboard → SQL → New query
-- Project: trail (ref: nyrtsmzxdtyboxeqdluk)
-- ============================================================

-- Workout sessions (cloud sync from GymBro app)
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

drop policy if exists "workout_sessions_select" on public.workout_sessions;
drop policy if exists "workout_sessions_insert" on public.workout_sessions;
drop policy if exists "workout_sessions_update" on public.workout_sessions;
drop policy if exists "workout_sessions_delete" on public.workout_sessions;

create policy "workout_sessions_select"
  on public.workout_sessions for select using (true);
create policy "workout_sessions_insert"
  on public.workout_sessions for insert with check (true);
create policy "workout_sessions_update"
  on public.workout_sessions for update using (true);
create policy "workout_sessions_delete"
  on public.workout_sessions for delete using (true);

-- Custom exercises (optional cloud backup)
create table if not exists public.custom_exercises (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (category, name)
);

alter table public.custom_exercises enable row level security;

drop policy if exists "custom_exercises_select" on public.custom_exercises;
drop policy if exists "custom_exercises_insert" on public.custom_exercises;
drop policy if exists "custom_exercises_delete" on public.custom_exercises;

create policy "custom_exercises_select"
  on public.custom_exercises for select using (true);
create policy "custom_exercises_insert"
  on public.custom_exercises for insert with check (true);
create policy "custom_exercises_delete"
  on public.custom_exercises for delete using (true);

-- Verify
select tablename from pg_tables
where schemaname = 'public'
  and tablename in ('workout_sessions', 'custom_exercises')
order by tablename;
