-- Tighten custom_exercises (was open to anon) and ensure training_days is user-scoped

drop policy if exists "custom_exercises_select" on public.custom_exercises;
drop policy if exists "custom_exercises_insert" on public.custom_exercises;
drop policy if exists "custom_exercises_delete" on public.custom_exercises;

create policy "custom_exercises_select"
  on public.custom_exercises
  for select
  to authenticated
  using (true);

create policy "custom_exercises_insert"
  on public.custom_exercises
  for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "custom_exercises_delete"
  on public.custom_exercises
  for delete
  to authenticated
  using (auth.uid() is not null);

alter table if exists public.training_days enable row level security;

drop policy if exists "training_days_select" on public.training_days;
drop policy if exists "training_days_insert" on public.training_days;
drop policy if exists "training_days_update" on public.training_days;
drop policy if exists "training_days_delete" on public.training_days;

create policy "training_days_select"
  on public.training_days
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "training_days_insert"
  on public.training_days
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "training_days_update"
  on public.training_days
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "training_days_delete"
  on public.training_days
  for delete
  to authenticated
  using (auth.uid() = user_id);
