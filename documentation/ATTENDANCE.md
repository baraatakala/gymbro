# Training habits & attendance

Open **Sidebar → Training habits & attendance** (global, all sections).

## Data sources

| Metric | Source |
|--------|--------|
| Gym visits / month | `training_days` + session days with logged sets |
| Streak / longest streak | `trainingCalendar.ts` on distinct trained dates |
| Avg time in gym | `started_at` → `finished_at`, or first→last set `logged_at` |
| Check-in → first set | `started_at` (check-in) vs earliest `workout_sets.logged_at` |
| Section frequency | Count sessions per `workout_sessions.day` |
| Weekday skips | Lowest count by Mon–Sun in selected range |
| Best hour | Hour of first set logged per session day |
| Long rests | Gaps between set `logged_at` (30s–10min) + local rest timer log |
| Weekly goal % | Weeks with ≥ N distinct gym days / weeks in range |

## Check-in / check-out

- **Check-in:** switching section or saving first set → `recordLocalCheckIn` + `touchSessionCheckIn` → `started_at`
- **Check-out:** **Finish workout** → `finished_at`, `status: completed`

Apply migration `20260531120000_session_timing_attendance.sql` in Supabase SQL editor if columns are missing.

## Weekly target

Stored in `localStorage` (`gymbro_weekly_target_days`, default 4). Adjustable in the attendance modal.
