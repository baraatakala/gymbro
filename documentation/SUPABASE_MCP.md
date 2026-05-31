# Supabase + Cursor MCP

## GymBro live project

| Setting | Value |
|---------|--------|
| URL | `https://nyrtsmzxdtyboxeqdluk.supabase.co` |
| Ref | `nyrtsmzxdtyboxeqdluk` (see `.env.production`) |

## MCP status (verified)

Use **`.cursor/mcp.json`** with `https://mcp.supabase.com/mcp?project_ref=nyrtsmzxdtyboxeqdluk` and the **`user-supabase`** server in Cursor (not the generic plugin with `project_id`).

- `apply_migration` / `execute_sql` on **trail** — OK via `user-supabase`
- `plugin-supabase-supabase` + `project_id: nyrtsmzxdtyboxeqdluk` — often **permission denied**
- Migration `active_session_hardening` — applied (6h auto-close, one `in_progress` per user, dedupe before unique index)

## Local audits (always works)

```bash
npm run audit:supabase
npm run verify
```

Uses keys from `.env` / `.env.production` and the anon user session.
