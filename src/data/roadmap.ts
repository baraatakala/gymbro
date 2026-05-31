export type Priority = 'must-have' | 'high value' | 'nice to have'
export type RoadmapTab = 'core' | 'ai' | 'workflow' | 'social'

export interface RoadmapFeature {
  id: string
  title: string
  description: string
  priority: Priority
  tab: RoadmapTab
  status: 'live' | 'schema' | 'partial' | 'planned'
  action?: string
}

export interface WorkflowStep {
  step: number
  title: string
  description: string
  status: 'live' | 'partial' | 'planned'
}

export const ROADMAP_FEATURES: RoadmapFeature[] = [
  {
    id: 'exercise-library',
    title: 'Exercise library',
    description:
      '200+ exercises with muscle groups, equipment type, and movement pattern. Seeded in Supabase. Search, filter, and favourite.',
    priority: 'must-have',
    tab: 'core',
    status: 'schema',
    action: 'Design schema',
  },
  {
    id: 'templates',
    title: 'Workout templates',
    description:
      'Save any session as a reusable template (Push Day A, Full Body). One tap starts a new session pre-filled from last run.',
    priority: 'must-have',
    tab: 'core',
    status: 'schema',
    action: 'Build it',
  },
  {
    id: 'rest-timer',
    title: 'Rest timer',
    description:
      'Auto-starts between sets. Configurable per exercise (default 90s). Vibrates on mobile. Preferred rest stored in Supabase.',
    priority: 'must-have',
    tab: 'core',
    status: 'live',
    action: 'Build it',
  },
  {
    id: 'prs',
    title: 'Personal records (PRs)',
    description:
      'Auto-tracked per exercise. Supabase trigger updates personal_records on every set insert. Celebratory toast on new PR.',
    priority: 'must-have',
    tab: 'core',
    status: 'schema',
    action: 'Write trigger',
  },
  {
    id: 'overload',
    title: 'Progressive overload tracker',
    description:
      'Per-exercise weight and volume trends. Auto-suggests +2.5 kg if last 3 sessions hit all reps. Shown beside logging UI.',
    priority: 'high value',
    tab: 'core',
    status: 'partial',
    action: 'Build it',
  },
  {
    id: 'streak',
    title: 'Streak & heatmap calendar',
    description:
      'Days-trained streak with GitHub-style calendar. Weekly consistency %. Badges at 7 / 30 / 100 days.',
    priority: 'high value',
    tab: 'core',
    status: 'schema',
    action: 'Build it',
  },
  {
    id: 'body-metrics',
    title: 'Body metrics log',
    description:
      'Weight, body fat %, measurements over time. Trend chart with strength gains. Optional photo log (Storage).',
    priority: 'high value',
    tab: 'core',
    status: 'schema',
    action: 'Build it',
  },
  {
    id: 'hydration',
    title: 'Hydration & nutrition log',
    description: 'Water intake per day. Optional macros linked to workout days.',
    priority: 'nice to have',
    tab: 'core',
    status: 'planned',
  },
  {
    id: 'progress-photos',
    title: 'Progress photo timeline',
    description: 'Private scrollable timeline. Supabase Storage with owner-only RLS.',
    priority: 'nice to have',
    tab: 'core',
    status: 'planned',
    action: 'Setup guide',
  },
  {
    id: 'ai-coach',
    title: 'AI coach card',
    description:
      'Post-session Anthropic API returns 3–4 coaching bullets on the summary screen. Cached per session.',
    priority: 'high value',
    tab: 'ai',
    status: 'planned',
    action: 'Ask Claude',
  },
  {
    id: 'ai-program',
    title: 'AI starter program',
    description: 'Generates a program from onboarding. Saved as templates. First session starts immediately.',
    priority: 'high value',
    tab: 'ai',
    status: 'planned',
  },
  {
    id: 'ai-refresh',
    title: 'Monthly program refresh',
    description: 'After 4 weeks, AI analyses progress and proposes an updated 4-week plan.',
    priority: 'high value',
    tab: 'ai',
    status: 'planned',
    action: 'Design it',
  },
  {
    id: 'badges',
    title: 'Badge system',
    description: 'Milestones: first PR, 7-day streak, 100 sessions, 10k kg volume. Shown on profile.',
    priority: 'high value',
    tab: 'social',
    status: 'schema',
  },
  {
    id: 'leaderboards',
    title: 'Friend leaderboards',
    description: 'Weekly volume or streak ranking. Invite by email. Resets Monday.',
    priority: 'nice to have',
    tab: 'social',
    status: 'planned',
  },
  {
    id: 'pr-cards',
    title: 'Shareable PR cards',
    description: 'Canvas-rendered card on PR hit. Share to WhatsApp / Instagram Stories.',
    priority: 'nice to have',
    tab: 'social',
    status: 'planned',
  },
  {
    id: 'challenges',
    title: 'Challenges',
    description: 'Monthly community challenges with progress tracking and winner badges.',
    priority: 'nice to have',
    tab: 'social',
    status: 'planned',
  },
  {
    id: 'feed',
    title: 'Activity feed',
    description: "Friends' PRs and milestones. Like and comment. RLS-scoped to friendship graph.",
    priority: 'nice to have',
    tab: 'social',
    status: 'planned',
  },
  {
    id: 'reminders',
    title: 'Smart reminders',
    description: 'Push based on program schedule. Adapts if trained yesterday or missed two days.',
    priority: 'nice to have',
    tab: 'social',
    status: 'planned',
    action: 'Design social schema',
  },
]

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: 1,
    title: 'Onboarding',
    description:
      'Goal, experience, days/week, equipment. Stored in user_profiles. Drives recommendations.',
    status: 'planned',
  },
  {
    step: 2,
    title: 'First session (guided)',
    description: 'AI starter program from onboarding. Saved as templates. Session starts immediately.',
    status: 'planned',
  },
  {
    step: 3,
    title: 'Start workout',
    description:
      'Pick template or blank. Creates workout_sessions with started_at. Survives app close.',
    status: 'partial',
  },
  {
    step: 4,
    title: 'Log sets in real time',
    description:
      'Weight + reps per set. Previous targets shown. Rest timer auto-starts. PR alert on beat.',
    status: 'live',
  },
  {
    step: 5,
    title: 'Finish & review',
    description:
      'Summary: volume, duration, PRs, muscles worked. RPE rating. Streak updated.',
    status: 'planned',
  },
  {
    step: 6,
    title: 'AI coach card',
    description: 'Post-session coaching bullets on summary screen.',
    status: 'planned',
  },
  {
    step: 7,
    title: 'Next session prep',
    description: 'Home: streak, next workout, overload suggestions, motivational message.',
    status: 'partial',
  },
  {
    step: 8,
    title: 'Monthly review',
    description: 'AI analyses 4-week progress and refreshes program if needed.',
    status: 'planned',
  },
]
