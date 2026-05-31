# Supabase audit (trail project)

Live checks via Cursor MCP server **`user-supabase`** (see `.cursor/mcp.json`, `project_ref=nyrtsmzxdtyboxeqdluk`).

## MCP tools to use

| Tool | Use |
|------|-----|
| `get_advisors` | Security + performance lints after DDL |
| `list_migrations` | Confirm remote migration history |
| `execute_sql` | Row counts, integrity, triggers (read-only audits) |
| `apply_migration` | DDL / policy / backfill (tracked) |

Do **not** pass `project_id` — the MCP URL is already scoped to trail.

## Latest snapshot (MCP `execute_sql`)

| Table | Rows |
|-------|------|
| exercises | 57 |
| muscle_groups | 7 |
| workout_days | 14 |
| workout_day_exercises | 79 |
| workout_sessions | 2 (Chest only, 1 user) |
| workout_sets | 6 |
| personal_records | 1 (Chest Dip) |
| training_days | 2 after backfill |
| orphan sessions | 0 |

**Integrity:** `total_volume_kg` matches `sum(weight × reps)` on sets. PR trigger `trg_update_pr_on_set` active. Session user trigger `trg_set_workout_session_user_id` active.

## Migrations on remote

All local `supabase/migrations/*` through `tighten_claim_orphan_policy` are applied, plus:

- `revoke_rpc_execute_authenticated`
- `backfill_training_days_from_sessions`

## Security advisors (expected)

- **Anonymous policies** — app uses anonymous auth; user tables still scoped with `auth.uid() = user_id`.
- **SECURITY DEFINER RPC** — `REVOKE EXECUTE` from `anon` + `authenticated`; triggers only.
- **Leaked password protection** — enable in Dashboard if you add email/password later.

## Schema reference

See [DATA_MODEL.md](./DATA_MODEL.md) for FKs, constraints, RLS, triggers, and indexing review.

## Client ↔ DB alignment

- Saves upsert `training_days` per calendar day (`recordTrainingDay`).
- Finish workout also records training day.
- RLS: sessions/sets/PRs only for `auth.uid()`.
- Orphan claim: `storage_key` only (no bulk claim by section name).

## Re-run audit locally

```bash
node scripts/audit-supabase.mjs
```

Service-role totals: `supabase/audit-all-tables.sql` in SQL Editor.
