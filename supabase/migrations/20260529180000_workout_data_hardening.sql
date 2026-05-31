-- Query performance: primary session fetch pattern (user + section + recency)
create index if not exists workout_sessions_user_day_ts_idx
  on public.workout_sessions (user_id, day, timestamp desc);

create index if not exists personal_records_user_achieved_idx
  on public.personal_records (user_id, achieved_at desc);

-- Default timestamp on set rows (PR trigger uses logged_at)
alter table public.workout_sets
  alter column logged_at set default now();

-- Auto-assign user_id on insert (anonymous auth → authenticated role)
create or replace function public.set_workout_session_user_id()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_workout_session_user_id on public.workout_sessions;
create trigger trg_set_workout_session_user_id
  before insert on public.workout_sessions
  for each row
  execute function public.set_workout_session_user_id();

-- Remove permissive policy that allowed anyone to mutate orphan rows
drop policy if exists "workout_sessions_anon_sync" on public.workout_sessions;

-- Inserts must belong to the signed-in user
drop policy if exists "workout_sessions_write" on public.workout_sessions;
create policy "workout_sessions_write"
  on public.workout_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);
