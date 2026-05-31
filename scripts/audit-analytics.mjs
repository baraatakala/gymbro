/**
 * Sanity-check analytics math (no Supabase). Mirrors core formulas in src/lib/analytics.ts
 * Run: node scripts/audit-analytics.mjs
 */

function setVolume(entries) {
  return entries.reduce((s, e) => (e.weight > 0 ? s + e.weight * Math.max(1, e.reps) : s), 0)
}

function sessionMax(entries) {
  const w = entries.map((e) => e.weight).filter((x) => x > 0)
  return w.length ? Math.max(...w) : 0
}

const day1 = {
  timestamp: new Date('2026-01-01').getTime(),
  exerciseSets: {
    'Bench Press': [
      { weight: 60, reps: 8 },
      { weight: 65, reps: 8 },
      { weight: 70, reps: 6 },
    ],
  },
}
const day2 = {
  timestamp: new Date('2026-01-08').getTime(),
  exerciseSets: {
    'Bench Press': [
      { weight: 62.5, reps: 8 },
      { weight: 67.5, reps: 8 },
      { weight: 72.5, reps: 6 },
    ],
  },
}

const vol1 = setVolume(day1.exerciseSets['Bench Press'])
const vol2 = setVolume(day2.exerciseSets['Bench Press'])
const max1 = sessionMax(day1.exerciseSets['Bench Press'])
const max2 = sessionMax(day2.exerciseSets['Bench Press'])
const gapDays = (day2.timestamp - day1.timestamp) / (86400000)

let failed = 0
function check(ok, msg) {
  if (ok) console.log(`OK: ${msg}`)
  else {
    console.error(`FAIL: ${msg}`)
    failed++
  }
}

check(vol1 === 60 * 8 + 65 * 8 + 70 * 6, `day1 volume = ${vol1}`)
check(vol2 > vol1, `day2 volume > day1 (${vol2} > ${vol1})`)
check(max2 === 72.5, `day2 max = 72.5 (got ${max2})`)
check(Math.abs(gapDays - 7) < 0.01, `gap between days ≈ 7 (got ${gapDays})`)

const improvement =
  (((max1 + max2) / 2 - max1) / max1) * 100 // simplified: avg max went up
check(max2 > max1, 'progressive overload on bench max')

console.log(failed === 0 ? '\nAnalytics audit passed.' : `\n${failed} check(s) failed.`)
process.exit(failed === 0 ? 0 : 1)
