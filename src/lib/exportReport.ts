import { calculateDayStats, calculatePersonalRecords } from './analytics'
import { isCardioSection } from './sectionUtils'
import { collapseSessionsByDay } from './sessionMerge'
import { fetchAllUserSessions } from './supabaseSessions'
import { getAllSessions } from './storage'
import { isSupabaseConfigured } from './supabase'
import type { PersonalRecord, WorkoutSession } from '../types/workout'
import type { UserWorkoutPlan } from '../types/plan'

export const EXPORT_VERSION = 'gymbro-export-v2'

export interface SectionExportBundle {
  section: string
  sessionDays: number
  stats: ReturnType<typeof calculateDayStats>
  sessions: WorkoutSession[]
}

export interface GymBroExportBundle {
  version: string
  exportedAt: string
  plan: UserWorkoutPlan
  personalRecords: PersonalRecord[]
  sections: SectionExportBundle[]
  totals: {
    sectionCount: number
    sessionDays: number
    totalVolumeKg: number
    totalSets: number
  }
}

export async function buildGymBroExport(
  plan: UserWorkoutPlan,
  cloudRecords: PersonalRecord[],
  currentSectionSessions: WorkoutSession[],
  currentSectionName: string,
): Promise<GymBroExportBundle> {
  const allSessions = isSupabaseConfigured
    ? await fetchAllUserSessions()
    : getAllSessions()

  const bySection = new Map<string, WorkoutSession[]>()
  for (const s of allSessions) {
    const list = bySection.get(s.day) ?? []
    list.push(s)
    bySection.set(s.day, list)
  }

  if (currentSectionSessions.length > 0) {
    bySection.set(currentSectionName, currentSectionSessions)
  }

  for (const day of plan.days) {
    if (!bySection.has(day.name)) bySection.set(day.name, [])
  }

  const sections: SectionExportBundle[] = plan.days.map((d) => {
    const raw = bySection.get(d.name) ?? []
    const collapsed = collapseSessionsByDay(raw)
    return {
      section: d.name,
      sessionDays: collapsed.length,
      stats: calculateDayStats(collapsed, { cardio: isCardioSection(d.name) }),
      sessions: collapsed,
    }
  })

  const sessionDays = sections.reduce((n, s) => n + s.sessionDays, 0)
  const totalVolumeKg = sections.reduce((n, s) => n + s.stats.totalVolume, 0)
  const totalSets = sections.reduce((n, s) => n + s.stats.setCount, 0)

  const records =
    cloudRecords.length > 0
      ? cloudRecords
      : calculatePersonalRecords(allSessions)

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    plan,
    personalRecords: records,
    sections,
    totals: {
      sectionCount: plan.days.length,
      sessionDays,
      totalVolumeKg,
      totalSets,
    },
  }
}

export function exportBundleToJson(bundle: GymBroExportBundle): string {
  return JSON.stringify(bundle, null, 2)
}

/** Flat CSV: one row per set for spreadsheets. */
export function exportBundleToSetsCsv(bundle: GymBroExportBundle): string {
  const header = 'section,date,time,exercise,set_number,weight_kg,reps,volume_kg'
  const rows: string[] = [header]

  for (const sec of bundle.sections) {
    for (const session of sec.sessions) {
      const date = new Date(session.timestamp).toLocaleDateString('en-GB')
      const time = session.saveTime ?? ''
      if (session.exerciseSets) {
        for (const [exercise, entries] of Object.entries(session.exerciseSets)) {
          entries.forEach((e, i) => {
            if (e.weight <= 0) return
            const vol = e.weight * Math.max(1, e.reps)
            rows.push(
              [
                csvCell(sec.section),
                csvCell(date),
                csvCell(time),
                csvCell(exercise),
                String(i + 1),
                String(e.weight),
                String(e.reps),
                String(vol),
              ].join(','),
            )
          })
        }
      } else {
        for (const [exercise, sets] of Object.entries(session.exercises ?? {})) {
          for (const [setLabel, weight] of Object.entries(sets)) {
            if (weight <= 0) continue
            const setNum = parseInt(setLabel.replace(/\D/g, ''), 10) || 1
            rows.push(
              [
                csvCell(sec.section),
                csvCell(date),
                csvCell(time),
                csvCell(exercise),
                String(setNum),
                String(weight),
                '8',
                String(weight * 8),
              ].join(','),
            )
          }
        }
      }
    }
  }

  return rows.join('\n')
}

export function exportRecordsToCsv(records: PersonalRecord[]): string {
  const header = 'exercise,weight_kg,reps,date'
  const rows = records.map((r) =>
    [
      csvCell(r.exercise),
      String(r.weight),
      String(r.reps ?? ''),
      new Date(r.date).toLocaleDateString('en-GB'),
    ].join(','),
  )
  return [header, ...rows].join('\n')
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function downloadTextFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
