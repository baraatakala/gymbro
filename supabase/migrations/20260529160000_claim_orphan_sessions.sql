-- Let signed-in users adopt legacy workout_sessions rows saved without user_id
drop policy if exists "workout_sessions_claim_orphan" on public.workout_sessions;

create policy "workout_sessions_claim_orphan"
  on public.workout_sessions
  for update
  to authenticated
  using (user_id is null and storage_key is not null)
  with check (auth.uid() = user_id);
