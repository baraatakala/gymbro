/**
 * Section visit counting sanity (mirrors attendanceAnalytics fix).
 * Run: node scripts/verify-insights.mjs
 */

let failed = 0
function check(ok, msg) {
  if (ok) console.log(`OK: ${msg}`)
  else {
    console.error(`FAIL: ${msg}`)
    failed++
  }
}

/** One visit per unique section per gym day, not per save row. */
function countSectionVisits(daySessions) {
  const sectionsThisDay = new Set(daySessions.map((s) => s.section))
  const visits = new Map()
  for (const section of sectionsThisDay) {
    visits.set(section, (visits.get(section) ?? 0) + 1)
  }
  return visits
}

const daySessions = [
  { section: 'Chest' },
  { section: 'Chest' },
  { section: 'Chest' },
]
const visits = countSectionVisits(daySessions)
check(visits.get('Chest') === 1, 'Chest counted once per day with 3 saves')

const multi = countSectionVisits([{ section: 'Chest' }, { section: 'Back' }])
check(multi.get('Chest') === 1 && multi.get('Back') === 1, 'two sections same day')

console.log(failed === 0 ? '\nInsights verify passed.' : `\n${failed} failed.`)
process.exit(failed === 0 ? 0 : 1)
