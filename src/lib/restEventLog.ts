/** Client-side rest timer completions (synced with cloud when possible). */
export interface RestEvent {
  at: number
  section: string
  exercise: string
  seconds: number
}

const KEY = 'gymbro_rest_events'

export function logRestEvent(section: string, exercise: string, seconds: number): void {
  try {
    const raw = localStorage.getItem(KEY)
    const list: RestEvent[] = raw ? JSON.parse(raw) : []
    list.push({ at: Date.now(), section, exercise, seconds })
    if (list.length > 500) list.splice(0, list.length - 500)
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function getRestEventsInRange(fromMs: number, toMs: number): RestEvent[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list: RestEvent[] = raw ? JSON.parse(raw) : []
    return list.filter((e) => e.at >= fromMs && e.at <= toMs)
  } catch {
    return []
  }
}
