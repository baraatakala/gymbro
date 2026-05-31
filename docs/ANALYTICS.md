# Analytics & calculations

## Session merging

| Function | Purpose |
|----------|---------|
| `sessionsTodayOnly` | Merges all saves **today** for the active section |
| `collapseSessionsByDay` | One logical row per **calendar day** (`calendarDayKey`, local `en-CA`) |
| `mergeSessionsForPrefill` | Newest session wins per exercise name (prefill / compare) |

## Stats (`calculateDayStats`)

- **Volume (strength):** `weight × reps` per set from `workout_sets`; legacy JSON uses `DEFAULT_REPS_PER_SET` (8) when reps are missing.
- **Volume (cardio):** weights = minutes; volume = sum of minutes.
- **Avg weight:** mean of all logged set weights (not per-exercise average).
- **Exercise count:** unique exercise names across merged sessions (not summed per row).
- **Improvement %:** compares average per-exercise weight on **oldest vs newest** session day (null for cardio or &lt; 2 days).

## Personal records

- **Cloud:** one row per `(user_id, exercise_name)`; best weight, then reps.
- **UI records tab:** filtered to **plan exercises** for the open section only.
- **Computed PRs:** `calculatePersonalRecords` from session history when cloud list is empty.

## Insights (`generateInsights`)

Uses collapsed session history plus optional:

- `savedToday` / `totalExercises` — today’s plan progress
- `sectionExerciseNames` — coverage of planned lifts
- `cloudRecords` — PR highlights scoped to section exercises

## Export (`exportReport`)

- Loads all user sessions from Supabase when configured.
- Per-section stats use `collapseSessionsByDay` + cardio flag from section name.
- Totals sum section volumes and set counts.

## Integrity rules

- Saves require all 3 strength sets &gt; 0 (cardio: at least one duration &gt; 0).
- Weights clamped: strength ≤ 500 kg, cardio ≤ 180 min.
- Delete section → sessions, sets, and PRs for that section’s plan exercises.
- Delete plan exercise → removes that exercise from section history + PR row.
