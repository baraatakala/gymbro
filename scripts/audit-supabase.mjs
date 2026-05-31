/**
 * GymBro Supabase audit (uses .env + anonymous sign-in).
 * Run: node scripts/audit-supabase.mjs
 *
 * Note: counts are per signed-in user (RLS). For full DB totals use
 * Supabase MCP server "user-supabase" (see .cursor/mcp.json) or audit-all-tables.sql.
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  let raw = readFileSync('.env', 'utf8')
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or key in .env')
  process.exit(1)
}

const supabase = createClient(url, key)
const { data: authData, error: authErr } = await supabase.auth.signInAnonymously()
if (authErr) {
  console.error('Auth failed:', authErr.message)
  process.exit(1)
}
const userId = authData.user?.id
console.log('User:', userId)

const tables = [
  'workout_days',
  'workout_day_exercises',
  'exercises',
  'muscle_groups',
  'workout_sessions',
  'workout_sets',
  'personal_records',
  'training_days',
  'custom_exercises',
]

for (const table of tables) {
  const { count, error: countErr } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (countErr) {
    console.log(`\n${table}: ERROR — ${countErr.message}`)
    continue
  }
  console.log(`\n${table}: ${count ?? 0} rows`)
}

const { data: days } = await supabase
  .from('workout_days')
  .select('id, name, user_id')
  .order('name')
console.log('\n--- workout_days (sample) ---')
console.log(JSON.stringify(days?.slice(0, 20), null, 2))

const { data: backDay } = await supabase
  .from('workout_days')
  .select('id, name')
  .eq('name', 'Back')
  .maybeSingle()

if (backDay?.id) {
  const { data: backEx } = await supabase
    .from('workout_day_exercises')
    .select('name, sort_order')
    .eq('day_id', backDay.id)
    .order('sort_order')
  console.log('\n--- Back plan exercises ---')
  console.log(backEx?.map((e) => e.name).join(', '))
}

const { data: backSessions } = await supabase
  .from('workout_sessions')
  .select('id, day, timestamp, user_id, save_date, exercises')
  .eq('day', 'Back')
  .order('timestamp', { ascending: false })
  .limit(5)
console.log('\n--- Back workout_sessions (latest 5) ---')
console.log(JSON.stringify(backSessions, null, 2))

const { data: prs } = await supabase
  .from('personal_records')
  .select('exercise_name, weight_kg, reps, achieved_at, user_id')
  .order('weight_kg', { ascending: false })
  .limit(10)
console.log('\n--- personal_records (top 10) ---')
console.log(JSON.stringify(prs, null, 2))

const { data: trainingDays } = await supabase
  .from('training_days')
  .select('trained_on, sessions_count')
  .order('trained_on', { ascending: false })
  .limit(10)
console.log('\n--- training_days (latest) ---')
console.log(JSON.stringify(trainingDays, null, 2))

const { data: chestSessions } = await supabase
  .from('workout_sessions')
  .select('id, day, timestamp, save_date, status, total_volume_kg')
  .eq('day', 'Chest')
  .order('timestamp', { ascending: false })
console.log('\n--- Chest sessions ---')
console.log(JSON.stringify(chestSessions, null, 2))
