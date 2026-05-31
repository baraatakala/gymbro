# Analytics & calculations

## Session merging

| Function | Purpose |
|----------|---------|
| `sessionsTodayOnly` | Merges all saves **today** for the active section |
| `collapseSessionsByDay` | One logical row per **calendar day** (`calendarDayKey`, local `en-CA`) |
| `mergeSessionsForPrefill` | Newest session wins per exercise name (prefill / compare) |

## Stats (`calculateDayStats`)

- **Volume (strength):** `weight ├ù reps` per set from `workout_sets`; legacy JSON uses `DEFAULT_REPS_PER_SET` (8) when reps are missing.
- **Volume (cardio):** weights = minutes; volume = sum of minutes.
- **Avg weight:** mean of all logged set weights (not per-exercise average).
- **Exercise count:** unique exercise names across merged sessions (not summed per row).
- **Improvement %:** compares average per-exercise weight on **oldest vs newest** session day (null for cardio or &lt; 2 days).

## Personal records

- **Cloud:** one row per `(user_id, exercise_name)`; best weight, then reps.
- **UI records tab:** `mergePersonalRecordSources(cloud, collapsed sessions)`; filtered to plan exercises; sort (weight / date / name) + search filter.

## Trends

| Metric | Strength | Cardio |
|--------|----------|--------|
| **max** (default) | Heaviest set per session day | Longest interval (max min) |
| **avg** | Mean weight across sets | Mean minutes |
| **volume** | Σ (weight × reps) per day | — |
| **Section volume** | Total kg for all exercises that day | hidden |

`averageDaysBetweenSessions` uses gaps between **consecutive calendar days**, not total span ÷ count.

## Insights (`generateInsights`)

Uses collapsed session history plus optional:

- `savedToday` / `totalExercises` — today's plan progress
- `sectionExerciseNames` — coverage; **14+ day stale** exercise reminders
- `cloudRecords` + sessions — merged PRs via `mergePersonalRecordSources`; est. **1RM** (Brzycki) on top lift
- **Volume plateau** — last 3 session days within 5% total volume

## Export (`exportReport`)

- Loads all user sessions from Supabase when configured.
- Per-section stats use `collapseSessionsByDay` + cardio flag from section name.
- Totals sum section volumes and set counts.

## Integrity rules

- Saves require all 3 strength sets &gt; 0 (cardio: at least one duration &gt; 0).
- Weights clamped: strength Γëñ 500 kg, cardio Γëñ 180 min.
- Delete section ΓåÆ sessions, sets, and PRs for that sectionΓÇÖs plan exercises.
- Delete plan exercise ΓåÆ removes that exercise from section history + PR row.
