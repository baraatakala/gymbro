# Insights (training habits)

For **check-in / check-out** steps see [WORKFLOW.md](./WORKFLOW.md).

## Navigation (split UI)



| View | How to open |

|------|-------------|

| **Workout** | Default — log sets, sections, finish workout |

| **Insights** | Left rail (desktop) or bottom bar **Insights** |
| **Section progress** | Dock **Progress** or sidebar **Section progress** |
| **Settings** | Dock **More** — timer, sync, exports |

Workout and Insights are separate full screens. Calendar is in Insights only (hidden in settings panel while on Insights).



## Insights workspace



- **Date range** — presets + custom from/to + weekly goal

- **KPI chips** — choose which metrics to show (saved in browser)

- **Tables** — Sections, Weekdays, Gym days, Rest gaps — search, sort, export CSV

- **Chart** — optional section or weekday bars (or hidden)

- **Calendar** — collapsible heatmap



**Section progress** modal stays section-only (volume, PRs, trends). Link to Insights for cross-training analysis.



## Logic fix



Section visit counts no longer multiply when you save multiple times the same gym day; time is split across sections trained that day.



## Supabase



Apply migrations:



- `20260531120000_session_timing_attendance.sql`

- `20260531130000_attendance_performance_indexes.sql`



## Verify



```bash
npm run verify
```

Runs attendance, insights, analytics, Supabase column probes (`started_at`, `logged_at`), and production build.


