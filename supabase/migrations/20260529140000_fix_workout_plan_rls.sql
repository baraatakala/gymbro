-- Fix 403 on workout_days insert: policies must apply to public role with auth.uid() checks

DROP POLICY IF EXISTS workout_days_own ON public.workout_days;
CREATE POLICY workout_days_own ON public.workout_days
  FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS workout_day_exercises_own ON public.workout_day_exercises;
CREATE POLICY workout_day_exercises_own ON public.workout_day_exercises
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_days d
      WHERE d.id = workout_day_exercises.day_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_days d
      WHERE d.id = workout_day_exercises.day_id
        AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workout_sets_insert ON public.workout_sets;
DROP POLICY IF EXISTS workout_sets_read ON public.workout_sets;

CREATE POLICY workout_sets_read ON public.workout_sets
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = workout_sets.session_id
        AND (s.user_id IS NULL OR s.user_id = auth.uid())
    )
  );

CREATE POLICY workout_sets_write ON public.workout_sets
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = workout_sets.session_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = workout_sets.session_id
        AND s.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_days TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_day_exercises TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sets TO anon, authenticated;
