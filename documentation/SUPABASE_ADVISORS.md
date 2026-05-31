# Supabase advisors — GymBro

Run via Cursor MCP (`user-supabase` → `get_advisors`) or Dashboard → Database → Advisors.

## Fixed in migrations

| Advisor | Fix |
|---------|-----|
| `anon` can execute `auto_close_stale_workout_sessions` | `REVOKE` from `anon`; grant `authenticated` only |
| Multiple permissive `UPDATE` on `workout_sessions` | Single `workout_sessions_update` policy (own + orphan claim) |
| `auth_rls_initplan` on profiles, favourites, templates, badges, body_metrics | `(SELECT auth.uid())` in policies |
| Unindexed FK `workout_sets.exercise_id` | `workout_sets_exercise_id_idx` |
| Invalid check-out before check-in | `workout_sessions_finished_after_started` CHECK |

## Intentional / accepted

| Advisor | Notes |
|---------|-------|
| `auth_allow_anonymous_sign_ins` | App uses **anonymous auth**; each user still isolated by `user_id = auth.uid()` |
| `auth_leaked_password_protection` | Enable in Dashboard if you add email/password sign-in later |
| Unused indexes (INFO) | Keep `workout_sessions_user_timestamp_idx` for attendance fetch; stats may show unused on small DB |
| `workout_sessions_user_day_ts_idx` unused | Still used for per-section history queries |

## Frontend analytics alignment

- **Gym day** (`gymDayKey`, 4 AM cutoff): streaks, Insights, export totals, session merge, duplicate consolidation
- **Visit averages**: exclude &lt;2 min and &gt;4 h outliers (`includeVisitInAverage`)
- **Volume / improvement**: `src/lib/analytics.ts` — verified by `npm run audit:analytics`

## Verify

```bash
npm run verify
npm run audit:supabase
```
