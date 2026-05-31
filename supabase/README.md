# Supabase (GymBro)

## Migrations (apply in order)

| File | Purpose |
|------|---------|
| `20260529120000_workout_sessions.sql` | Core sessions table |
| `20260529140000_fix_workout_plan_rls.sql` | Plan RLS |
| `20260529160000_claim_orphan_sessions.sql` | Claim orphans by `storage_key` |
| `20260529180000_workout_data_hardening.sql` | Indexes, session user trigger |
| `20260529200000_tighten_session_read_rls.sql` | User-scoped session/set reads |
| `20260529210000_custom_exercises_training_days_rls.sql` | Custom exercises + training_days |
| `20260529220000_drop_custom_exercises_public_policy.sql` | Remove permissive policy |
| `20260529230000_tighten_claim_orphan_policy.sql` | Claim requires `storage_key` |
| `20260529240000_revoke_rpc_execute_authenticated.sql` | Block direct RPC on trigger functions |
| `20260529250000_backfill_training_days.sql` | Backfill training calendar from sessions |

## Audit

```bash
node ../scripts/audit-supabase.mjs
```

Or run `audit-all-tables.sql` in the SQL editor (service role) for global counts.

## RLS summary

- **workout_sessions / sets:** read/write only when `auth.uid() = user_id` (sets via session join).
- **workout_days / plan exercises:** owned by user.
- **personal_records:** per-user rows.
- **exercises / muscle_groups:** public read (catalog).
