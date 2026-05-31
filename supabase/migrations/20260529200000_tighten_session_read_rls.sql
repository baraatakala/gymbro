-- Stop exposing all orphan (user_id null) sessions to every signed-in user on SELECT.

DROP POLICY IF EXISTS workout_sessions_read ON public.workout_sessions;
CREATE POLICY workout_sessions_read ON public.workout_sessions
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS workout_sets_read ON public.workout_sets;
CREATE POLICY workout_sets_read ON public.workout_sets
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = workout_sets.session_id
        AND s.user_id = auth.uid()
    )
  );
