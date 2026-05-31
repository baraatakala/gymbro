-- Remove permissive policy that overrides authenticated-only custom_exercises rules.

DROP POLICY IF EXISTS custom_exercises_public ON public.custom_exercises;

-- RPC hardening: triggers call these internally; block direct anon invocation.
REVOKE EXECUTE ON FUNCTION public.set_workout_session_user_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_personal_record_on_set() FROM PUBLIC, anon;
