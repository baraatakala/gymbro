/**
 * Attendance date-range sanity checks (no Supabase).
 * Run: node scripts/verify-attendance.mjs
 */

function toIsoDate(d) {
  return d.toLocaleDateString('en-CA')
}

function normalizeDateRange(range) {
  let from = range.from?.trim() ?? ''
  let to = range.to?.trim() ?? ''
  if (!from || !to) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 89)
    return { from: toIsoDate(start), to: toIsoDate(end) }
  }
  if (from > to) [from, to] = [to, from]
  return { from, to }
}

let failed = 0
function check(ok, msg) {
  if (ok) console.log(`OK: ${msg}`)
  else {
    console.error(`FAIL: ${msg}`)
    failed++
  }
}

const swapped = normalizeDateRange({ from: '2026-05-01', to: '2026-01-01' })
check(swapped.from === '2026-01-01' && swapped.to === '2026-05-01', 'swaps reversed date range')

const same = normalizeDateRange({ from: '2026-03-01', to: '2026-03-31' })
check(same.from === '2026-03-01', 'keeps valid range')

console.log(failed === 0 ? '\nAttendance verify passed.' : `\n${failed} failed.`)
process.exit(failed === 0 ? 0 : 1)
