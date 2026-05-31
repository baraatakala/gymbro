-- Keep workout_sessions.day aligned when a plan section is renamed (belt-and-suspenders with app update).
CREATE OR REPLACE FUNCTION public.sync_session_day_on_plan_rename()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name AND NEW.user_id IS NOT NULL THEN
    UPDATE public.workout_sessions
    SET day = NEW.name
    WHERE user_id = NEW.user_id
      AND day = OLD.name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_session_day_on_rename ON public.workout_days;

CREATE TRIGGER trg_sync_session_day_on_rename
AFTER UPDATE OF name ON public.workout_days
FOR EACH ROW
EXECUTE FUNCTION public.sync_session_day_on_plan_rename();

REVOKE ALL ON FUNCTION public.sync_session_day_on_plan_rename() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_session_day_on_plan_rename() FROM anon;
REVOKE ALL ON FUNCTION public.sync_session_day_on_plan_rename() FROM authenticated;
