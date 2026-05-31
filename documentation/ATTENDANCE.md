# Training habits & attendance

## Main page (primary)

After your plan loads, scroll below the status strip to **Gym habits — your answers**. This panel lists direct answers to every habit question (visits, avg time, streak, weekly goal %, check-in gap, sections, skip days, best hour, long rest). Use date presets or custom range; **Full report →** opens the tabbed modal (sections, patterns, calendar).

## How to open (modal)

| Entry point | Location |
|-------------|----------|
| Main dashboard | **Full report →** |
| Status strip | **📊 Habits** chip (when cloud/local data loaded) |
| Sidebar | **Training habits & attendance** |
| Section panel | **Training habits & attendance** button (under Section progress) |
| Progress modal | Link to habits from **Section progress** |

## Feature matrix (integrated)

| Your question | UI location | Data source |
|---------------|-------------|-------------|
| Gym visits in month / custom period | **Main dashboard** + Overview | `training_days` + sessions (sets from `workout_sets` or `exercises` JSON) |
| Average time in gym | Overview → Avg time in gym | Check-in → last set / finish; estimates if same-second saves |
| Which muscle / section days most | **Sections** tab → bars + list | `workout_sessions.day` |
| Time per section | Sections → total time bars | Session duration per day |
| Longest streak | Overview | `computeTrainingStreak` |
| % weeks on 4-day (configurable) target | Overview → Weeks on target | Weekly buckets vs goal |
| Check-in → first exercise | Overview | Local check-in + `started_at` vs `logged_at` |
| Long rest between sets | **Patterns** tab | Set timestamps + rest timer log |
| Days skipped / neglected | Overview banner + insights | Plan sections with 0 logs in range |
| Least active weekday | **Patterns** tab | Mon–Sun counts (always 7 days) |
| Best time to go | Overview → Best time to start | Hour of first set per day |
| Calendar / heatmap | **Calendar** tab | `training_days` |

## Not in v1 (by design)

- GPS / gym location check-in
- Line charts for attendance trends (section progress modal has exercise trends)
- Hour × weekday heatmap (planned enhancement)
- Automatic “skipped day” from a fixed weekly schedule (uses your 14 plan sections instead)

## Workflow for accurate stats

1. **Open a section** → check-in recorded (browser + cloud when session exists)
2. **Save sets** → timestamps + optional rest timer
3. **Finish workout** → check-out for duration
4. Open **Training habits** → pick 30d–1y or custom dates

## Supabase

Apply migrations:

- `20260531120000_session_timing_attendance.sql`
- `20260531130000_attendance_performance_indexes.sql`

## Verify

```bash
npm run verify:attendance
npm run audit:analytics
npm run audit:supabase
```
