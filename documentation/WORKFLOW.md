# GymBro — check-in, workout, check-out

This is the product flow users should follow. The app implements it automatically; labels were added so it is visible on desktop and mobile.

## Check-in (start)

**There is no separate “Check in” button.**

Check-in happens when you:

1. Select a **section** (Chest, Back, …) in the section rail or day manager, or  
2. **Save** your first exercise for that section today.

The app stores `started_at` (cloud) and a local timestamp. On desktop, the **Gym session** bar shows **Check-in** time.

If you are online, selecting a section also creates an empty `workout_sessions` row for today so timing exists before the first save.

## During the workout

- Log sets per exercise and save each card.
- Rest timer runs between sets (optional).
- **Workout** view only — use **Insights** later for habits analytics.

## Check-out (end)

**End session** / **Finish workout** (mobile dock) = check-out.

Requirements:

- At least **one exercise saved** today for that section.

This sets `finished_at` and `status: completed` in Supabase (or local checkout timestamp offline). Visit duration in **Insights** uses check-in → check-out.

**Important:** Saving a set does **not** check you out. Only **End session** does.

## Navigation

| Goal | Where |
|------|--------|
| Log today’s lifts | **Workout** (default) |
| Visits, streak, time in gym, CSV | **Insights** |
| Section volume / PR charts | **Progress** |
| Backup JSON, sync, timer | **Settings** (dock **More**) |

## Insights & export

- **Insights** — filterable tables, KPI chips, optional chart, calendar; export CSV per table.
- **Settings → Export** — full JSON backup or sets/PR CSV.

See also [ATTENDANCE.md](./ATTENDANCE.md).

## Verify locally

```bash
npm run verify
npm run audit:supabase
```

Supabase MCP may be blocked in some environments; use the audit script with your project credentials instead.
