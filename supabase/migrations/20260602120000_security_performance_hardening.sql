-- Supabase advisor fixes: RPC grants, consolidated session UPDATE policy, RLS initplan, constraints

-- 1) auto_close_stale_workout_sessions: authenticated only (not callable by anon)
REVOKE ALL ON FUNCTION public.auto_close_stale_workout_sessions(numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_close_stale_workout_sessions(numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.auto_close_stale_workout_sessions(numeric) TO authenticated;

-- 2) One UPDATE policy (removes multiple permissive UPDATE policies)
DROP POLICY IF EXISTS workout_sessions_claim_orphan ON public.workout_sessions;
DROP POLICY IF EXISTS workout_sessions_own ON public.workout_sessions;

CREATE POLICY workout_sessions_select ON public.workout_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY workout_sessions_insert ON public.workout_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY workout_sessions_update ON public.workout_sessions
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (user_id IS NULL AND storage_key IS NOT NULL)
  )
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY workout_sessions_delete ON public.workout_sessions
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 3) Session timing integrity
ALTER TABLE public.workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_finished_after_started;

ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_finished_after_started
  CHECK (
    finished_at IS NULL
    OR started_at IS NULL
    OR finished_at >= started_at
  );

-- 4) Hot-path FK index (workout_sets by exercise_id)
CREATE INDEX IF NOT EXISTS workout_sets_exercise_id_idx
  ON public.workout_sets (exercise_id)
  WHERE exercise_id IS NOT NULL;

-- 5) RLS initplan on remaining high-traffic policies
DROP POLICY IF EXISTS profiles_own ON public.user_profiles;
CREATE POLICY profiles_own ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS favourites_own ON public.user_favourite_exercises;
CREATE POLICY favourites_own ON public.user_favourite_exercises
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS templates_own ON public.workout_templates;
CREATE POLICY templates_own ON public.workout_templates
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS template_exercises_own ON public.workout_template_exercises;
CREATE POLICY template_exercises_own ON public.workout_template_exercises
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates t
      WHERE t.id = workout_template_exercises.template_id
        AND t.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_templates t
      WHERE t.id = workout_template_exercises.template_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS body_metrics_own ON public.body_metrics;
CREATE POLICY body_metrics_own ON public.body_metrics
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_badges_own ON public.user_badges;
CREATE POLICY user_badges_own ON public.user_badges
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
