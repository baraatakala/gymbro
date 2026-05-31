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

## Two places store set data

| Store | Role |
|-------|------|
| `workout_sets` | **Source of truth** (one row per set) |
| `workout_sessions.exercises` | JSON snapshot; kept in sync by trigger `trg_sync_session_exercises_from_sets` |

Deleting only `workout_sets` rows used to leave stale JSON on the session — the app then still showed Cable Fly / volume. Trigger + client now treat **empty `workout_sets`** as no logged sets.

To wipe today’s lifts: delete `workout_sets` for that session (trigger clears JSON), or delete the `workout_sessions` row, or use **Settings → clear history**. Hard refresh after DB edits.

**Important:** Clearing sets only in the Table Editor does not clear **browser localStorage**. The app used to re-upload local logs on load; it now skips sync when the cloud session is empty and removes matching local keys.

## Frontend analytics alignment

- **Gym day** (`gymDayKey`, 4 AM cutoff): streaks, Insights, export totals, session merge, duplicate consolidation
- **Visit averages**: exclude &lt;2 min and &gt;4 h outliers (`includeVisitInAverage`)
- **Volume / improvement**: `src/lib/analytics.ts` — verified by `npm run audit:analytics`

## Verify

```bash
npm run verify
npm run audit:supabase
```
