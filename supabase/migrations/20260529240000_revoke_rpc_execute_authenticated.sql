-- Triggers still invoke these; block direct PostgREST RPC calls.
REVOKE EXECUTE ON FUNCTION public.set_workout_session_user_id() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_personal_record_on_set() FROM authenticated;
