-- Orphan claim: only rows with a device storage_key (no bulk claim by section name).

DROP POLICY IF EXISTS workout_sessions_claim_orphan ON public.workout_sessions;

CREATE POLICY workout_sessions_claim_orphan
  ON public.workout_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id IS NULL AND storage_key IS NOT NULL)
  WITH CHECK (auth.uid() = user_id);
