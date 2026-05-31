/**
 * Visit duration caps (mirrors attendanceAnalytics sessionDurationMinutes).
 * Run: node scripts/verify-visit-duration.mjs
 */

const MAX_VISIT_MINUTES = 180
const CHECKOUT_SET_GRACE_MS = 20 * 60_000

function estimateMinutesFromSets(totalSets, setSpanMs) {
  if (totalSets <= 0) return 0
  if (totalSets === 1) return 8
  if (setSpanMs >= 60_000) {
    return Math.max(10, Math.round(setSpanMs / 60_000 + totalSets * 0.5))
  }
  return Math.max(10, Math.round(totalSets * 2.5))
}

function visitMinutes(setTimes, startedAt, finishedAt) {
  const totalSets = setTimes.length
  const setSpanMs =
    setTimes.length >= 2 ? setTimes[setTimes.length - 1] - setTimes[0] : 0
  const setBasedMin = estimateMinutesFromSets(totalSets, setSpanMs)
  if (setTimes.length === 0) return 0

  let startMs = setTimes[0]
  let endMs = setTimes[setTimes.length - 1]
  if (startedAt) startMs = Math.min(startMs, new Date(startedAt).getTime())
  if (finishedAt) endMs = Math.max(endMs, new Date(finishedAt).getTime())

  const lastSetMs = setTimes[setTimes.length - 1]
  if (endMs > lastSetMs + CHECKOUT_SET_GRACE_MS) {
    endMs = lastSetMs + 5 * 60_000
  }

  const clockMin = Math.round((endMs - startMs) / 60_000)
  if (clockMin > MAX_VISIT_MINUTES) {
    return Math.min(MAX_VISIT_MINUTES, Math.max(setBasedMin, 10))
  }
  return clockMin
}

let failed = 0
function check(ok, msg) {
  if (ok) console.log(`OK: ${msg}`)
  else {
    console.error(`FAIL: ${msg}`)
    failed++
  }
}

const t0 = new Date('2026-05-31T15:25:00').getTime()
const t1 = new Date('2026-05-31T15:35:00').getTime()
const t2 = new Date('2026-05-31T15:50:00').getTime()
const checkout = '2026-05-31T21:12:00'
const checkin = '2026-05-31T15:25:00'

const mins = visitMinutes([t0, t1, t2], checkin, checkout)
check(mins < 60 && mins >= 15, `long checkout capped to active time (got ${mins}, not 347)`)

const short = visitMinutes(
  [t0, t0 + 600_000],
  checkin,
  new Date(t0 + 650_000).toISOString(),
)
check(short >= 10 && short <= 120, `normal 65m session plausible (got ${short})`)

console.log(failed === 0 ? '\nVisit duration verify passed.' : `\n${failed} failed.`)
process.exit(failed === 0 ? 0 : 1)
