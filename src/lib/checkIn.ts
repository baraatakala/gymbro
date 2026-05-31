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

export function getLocalCheckIn(section: string): string | undefined {
  try {
    return localStorage.getItem(`${PREFIX}${section}_${calendarDayKey(Date.now())}`) ?? undefined
  } catch {
    return undefined
  }
}
