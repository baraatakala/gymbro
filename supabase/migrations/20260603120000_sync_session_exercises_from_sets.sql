-- Keep workout_sessions.exercises + total_volume_kg aligned with workout_sets (source of truth).

CREATE OR REPLACE FUNCTION public.sync_session_exercises_from_sets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
  agg jsonb;
  vol numeric;
BEGIN
  sid := COALESCE(NEW.session_id, OLD.session_id);
  IF sid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(jsonb_object_agg(exercise_name, sets_json), '{}'::jsonb)
  INTO agg
  FROM (
    SELECT
      exercise_name,
      jsonb_object_agg('Set ' || set_number::text, to_jsonb(weight_kg) ORDER BY set_number) AS sets_json
    FROM public.workout_sets
    WHERE session_id = sid
    GROUP BY exercise_name
  ) grouped;

  SELECT COALESCE(SUM(weight_kg * reps), 0)
  INTO vol
  FROM public.workout_sets
  WHERE session_id = sid;

  UPDATE public.workout_sessions
  SET exercises = agg, total_volume_kg = vol
  WHERE id = sid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_session_exercises_from_sets ON public.workout_sets;
CREATE TRIGGER trg_sync_session_exercises_from_sets
AFTER INSERT OR UPDATE OR DELETE ON public.workout_sets
FOR EACH ROW
EXECUTE FUNCTION public.sync_session_exercises_from_sets();

REVOKE ALL ON FUNCTION public.sync_session_exercises_from_sets() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_session_exercises_from_sets() FROM anon;
REVOKE ALL ON FUNCTION public.sync_session_exercises_from_sets() FROM authenticated;
