/**
 * Gym day (4 AM cutoff) + visit average outlier rules.
 * Run: node scripts/verify-gym-day.mjs
 */

const GYM_DAY_CUTOFF_HOUR = 4

function gymDayKey(timestamp) {
  const d = new Date(timestamp)
  if (d.getHours() < GYM_DAY_CUTOFF_HOUR) {
    d.setDate(d.getDate() - 1)
  }
  return d.toLocaleDateString('en-CA')
}

function includeVisitInAverage(minutes) {
  return minutes >= 2 && minutes <= 240
}

let failed = 0
function check(ok, msg) {
  if (ok) console.log(`OK: ${msg}`)
  else {
    console.error(`FAIL: ${msg}`)
    failed++
  }
}

const monLate = new Date('2026-06-02T23:50:00').getTime()
const tueEarly = new Date('2026-06-03T00:10:00').getTime()
check(
  gymDayKey(monLate) === gymDayKey(tueEarly),
  'Mon 23:50 + Tue 00:10 share one gym day (streak grace)',
)

const morning = new Date('2026-06-03T10:00:00').getTime()
check(
  gymDayKey(tueEarly) !== gymDayKey(morning),
  '10:00 is a different gym day than 00:10',
)

check(!includeVisitInAverage(1), 'exclude <2 min from avg')
check(!includeVisitInAverage(300), 'exclude >4h from avg')
check(includeVisitInAverage(45), 'include normal visit in avg')

console.log(failed === 0 ? '\nGym day verify passed.' : `\n${failed} failed.`)
process.exit(failed === 0 ? 0 : 1)
