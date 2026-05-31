-- Revoke direct RPC on trigger-only SECURITY DEFINER function
REVOKE ALL ON FUNCTION public.sync_session_day_on_plan_rename() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_session_day_on_plan_rename() FROM anon;
REVOKE ALL ON FUNCTION public.sync_session_day_on_plan_rename() FROM authenticated;

-- Drop duplicate permissive policies (keep single "own" policies where equivalent)
DROP POLICY IF EXISTS personal_records_read ON public.personal_records;
DROP POLICY IF EXISTS training_days_select ON public.training_days;
DROP POLICY IF EXISTS training_days_insert ON public.training_days;
DROP POLICY IF EXISTS training_days_update ON public.training_days;
DROP POLICY IF EXISTS training_days_delete ON public.training_days;
DROP POLICY IF EXISTS workout_sessions_read ON public.workout_sessions;
DROP POLICY IF EXISTS workout_sessions_update ON public.workout_sessions;
DROP POLICY IF EXISTS workout_sessions_delete ON public.workout_sessions;
DROP POLICY IF EXISTS workout_sessions_write ON public.workout_sessions;
DROP POLICY IF EXISTS workout_sets_read ON public.workout_sets;

-- RLS initplan fix: (select auth.uid()) for hot-path policies
DROP POLICY IF EXISTS workout_sessions_own ON public.workout_sessions;
CREATE POLICY workout_sessions_own ON public.workout_sessions
  FOR ALL
  TO public
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS workout_sessions_claim_orphan ON public.workout_sessions;
CREATE POLICY workout_sessions_claim_orphan ON public.workout_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id IS NULL AND storage_key IS NOT NULL)
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS workout_sets_write ON public.workout_sets;
CREATE POLICY workout_sets_write ON public.workout_sets
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = workout_sets.session_id
        AND s.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = workout_sets.session_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS training_days_own ON public.training_days;
CREATE POLICY training_days_own ON public.training_days
  FOR ALL
  TO public
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS prs_own ON public.personal_records;
CREATE POLICY prs_own ON public.personal_records
  FOR ALL
  TO public
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS workout_days_own ON public.workout_days;
CREATE POLICY workout_days_own ON public.workout_days
  FOR ALL
  TO public
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS workout_day_exercises_own ON public.workout_day_exercises;
CREATE POLICY workout_day_exercises_own ON public.workout_day_exercises
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_days d
      WHERE d.id = workout_day_exercises.day_id
        AND d.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_days d
      WHERE d.id = workout_day_exercises.day_id
        AND d.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS custom_exercises_insert ON public.custom_exercises;
CREATE POLICY custom_exercises_insert ON public.custom_exercises
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS custom_exercises_delete ON public.custom_exercises;
CREATE POLICY custom_exercises_delete ON public.custom_exercises
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
