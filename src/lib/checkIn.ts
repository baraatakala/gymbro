import { calendarDayKey } from './dateUtils'

const PREFIX = 'gymbro_checkin_'

export function recordLocalCheckIn(section: string): string {
  const key = `${PREFIX}${section}_${calendarDayKey(Date.now())}`
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const iso = new Date().toISOString()
  try {
    localStorage.setItem(key, iso)
  } catch {
    /* ignore */
  }
  return iso
}

export function getLocalCheckIn(section: string, dayKey = calendarDayKey(Date.now())): string | undefined {
  try {
    return localStorage.getItem(`${PREFIX}${section}_${dayKey}`) ?? undefined
  } catch {
    return undefined
  }
}

/** Earliest browser check-in on a calendar day (any section). */
export function getEarliestLocalCheckInForDay(dayKey: string): string | undefined {
  try {
    let earliest: string | undefined
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(PREFIX) || !key.endsWith(`_${dayKey}`)) continue
      const iso = localStorage.getItem(key)
      if (!iso) continue
      if (!earliest || iso < earliest) earliest = iso
    }
    return earliest
  } catch {
    return undefined
  }
}
