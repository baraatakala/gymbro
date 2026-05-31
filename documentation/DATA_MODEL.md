# Data model review (GymBro + Supabase trail)

Verified via **Supabase MCP** `execute_sql` and local migrations.

## Entity relationship (core)

```mermaid
erDiagram
  auth_users ||--o{ workout_days : owns
  workout_days ||--o{ workout_day_exercises : contains
  exercises ||--o{ workout_day_exercises : optional_link
  auth_users ||--o{ workout_sessions : owns
  workout_sessions ||--o{ workout_sets : has
  exercises ||--o{ workout_sets : optional_link
  auth_users ||--o{ personal_records : owns
  exercises ||--o{ personal_records : optional_link
  workout_sets ||--o| personal_records : optional_source
  auth_users ||--o{ training_days : calendar
```

## Foreign keys ΓÇö verdict: **good**

| Child | Parent | ON DELETE | Notes |
|-------|--------|-----------|--------|
| `workout_day_exercises.day_id` | `workout_days` | CASCADE | Deleting section removes plan rows Γ£à |
| `workout_sets.session_id` | `workout_sessions` | CASCADE | Sets die with session Γ£à |
| `personal_records.user_id` | `auth.users` | CASCADE | User wipe removes PRs Γ£à |
| `workout_days.user_id` | `auth.users` | CASCADE | Γ£à |
| `training_days.user_id` | `auth.users` | CASCADE | Γ£à |
| `workout_sessions.user_id` | `auth.users` | SET NULL | Legacy orphans; app claims via `storage_key` only |

**Intentional denormalization:** `workout_sessions.day` is **text** (section name), not FK to `workout_days.id`. Renaming a section updates session `day` in app code.

## Constraints ΓÇö verdict: **well designed**

- `workout_sets`: UNIQUE `(session_id, exercise_name, set_number)` ΓÇö prevents duplicate set rows Γ£à
- `workout_sets`: CHECK `weight_kg >= 0`, `reps >= 0`, `set_number > 0` Γ£à
- `workout_sessions`: UNIQUE `storage_key`, CHECK `rpe` 1ΓÇô10 Γ£à
- `workout_days`: UNIQUE `(user_id, name)` ΓÇö no duplicate section names Γ£à
- `personal_records`: UNIQUE `(user_id, exercise_name)` ΓÇö one PR per lift Γ£à
- `training_days`: PRIMARY KEY `(user_id, trained_on)` Γ£à

**Minor redundancy:** two unique indexes on `personal_records (user_id, exercise_name)` ΓÇö safe to drop one (see migration note).

## RLS ΓÇö verdict: **good for multi-tenant anonymous app**

| Table | Model |
|-------|--------|
| `workout_sessions` | SELECT/WRITE `auth.uid() = user_id` |
| `workout_sets` | Access only if parent session owned |
| `workout_days` / `workout_day_exercises` | Via `workout_days.user_id` |
| `personal_records` | `auth.uid() = user_id` |
| `training_days` | `auth.uid() = user_id` |
| `exercises` / `muscle_groups` | Public read (catalog) |
| Orphan claim | UPDATE only `user_id IS NULL` + `storage_key` set |

Anonymous users are still isolated by `auth.uid()` per device account.

## Functions & triggers ΓÇö **required and correct**

| Object | Role |
|--------|------|
| `set_workout_session_user_id()` | BEFORE INSERT on `workout_sessions` ΓÇö sets `user_id` from JWT |
| `update_personal_record_on_set()` | AFTER INSERT on `workout_sets` ΓÇö maintains `personal_records` |
| RPC EXECUTE | Revoked from `anon` / `authenticated` ΓÇö triggers only, not direct API |

App also upserts PRs in `upsertPersonalRecordIfBetter` (belt-and-suspenders).

## Indexing ΓÇö **very good** (not perfect)

| Index | Serves |
|-------|--------|
| `workout_sessions_user_day_ts_idx` | Main fetch: user + section + time Γ£à |
| `workout_sessions_storage_key_key` | Local sync / claim Γ£à |
| `workout_sets_session_idx` | Join sets to session Γ£à |
| `workout_day_exercises_day_idx` | Load plan for section Γ£à |
| `personal_records_user_achieved_idx` | Recent PRs Γ£à |

**Optional future:** partial index `workout_sessions (user_id, day) WHERE status = 'in_progress'` if finish/status queries grow.

## Live data sanity (MCP)

- Chest: **6** plan exercises, **2** session days, volume **96 kg** = 3├ù8├ù4 kg Γ£à
- Back: **6** plan exercises, **0** sessions Γ£à
- **0** orphan sessions

## App Γåö schema alignment

- Saves write `workout_sets` + JSON `exercises` on session.
- `training_days` updated on each save (not only Finish).
- Section-scoped PRs and analytics filters in UI.
- `savedCount` only counts exercises **on the current plan** (fixes inflated counts).
