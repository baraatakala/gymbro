/** DB enum session_status — in_progress means “checked in / active”. */
export const SESSION_ACTIVE = 'in_progress' as const
export const SESSION_COMPLETED = 'completed' as const
export const SESSION_CANCELLED = 'cancelled' as const

export const STALE_SESSION_HOURS = 6

export function isActiveSessionStatus(status?: string | null): boolean {
  return status === SESSION_ACTIVE
}

export function isCompletedSessionStatus(status?: string | null): boolean {
  return status === SESSION_COMPLETED
}
