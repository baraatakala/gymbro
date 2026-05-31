import { supabase, isSupabaseConfigured } from './supabase'

const DEVICE_KEY = 'gymbro_device_id'

let signInFlight: Promise<EnsureUserResult> | null = null

/** Thrown when Supabase auth is configured but sign-in cannot complete. */
export class AuthSetupError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AuthSetupError'
    this.code = code
  }
}

export function isAuthSetupError(err: unknown): err is AuthSetupError {
  return err instanceof AuthSetupError
}

export type EnsureUserResult =
  | { ok: true; userId: string }
  | { ok: false; error: AuthSetupError }

function mapAuthError(error: { message?: string; code?: string }): AuthSetupError {
  const code = error.code ?? 'auth_error'
  const msg = error.message ?? 'Authentication failed'

  if (
    code === 'anonymous_provider_disabled' ||
    msg.toLowerCase().includes('anonymous sign-ins are disabled')
  ) {
    return new AuthSetupError(
      'anonymous_provider_disabled',
      'Anonymous sign-ins are disabled on this Supabase project. Enable them under Authentication → Providers → Anonymous, then click Retry.',
    )
  }

  return new AuthSetupError(code, msg)
}

/** Sign in without throwing — use for connection checks and read paths. */
export async function tryEnsureSupabaseUser(): Promise<EnsureUserResult> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      error: new AuthSetupError('not_configured', 'Supabase is not configured'),
    }
  }

  if (signInFlight) return signInFlight

  signInFlight = (async (): Promise<EnsureUserResult> => {
    try {
      const { data: sessionData } = await supabase!.auth.getSession()
      if (sessionData.session?.user?.id) {
        return { ok: true, userId: sessionData.session.user.id }
      }

      const { data, error } = await supabase!.auth.signInAnonymously()
      if (error) {
        return { ok: false, error: mapAuthError(error) }
      }

      if (data.session) {
        await supabase!.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
      }

      const userId = data.user?.id ?? data.session?.user?.id ?? null
      if (!userId) {
        return {
          ok: false,
          error: new AuthSetupError('no_user', 'Signed in but no user id was returned.'),
        }
      }

      localStorage.setItem(DEVICE_KEY, userId)
      return { ok: true, userId }
    } finally {
      signInFlight = null
    }
  })()

  return signInFlight
}

/** Sign in; throws {@link AuthSetupError} on failure (for writes / plan setup). */
export async function ensureSupabaseUser(): Promise<string | null> {
  const result = await tryEnsureSupabaseUser()
  if (!result.ok) throw result.error
  return result.userId
}

export async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

/** Project ref for dashboard deep links (from VITE_SUPABASE_URL). */
export function getSupabaseProjectRef(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!url) return null
  try {
    const host = new URL(url).hostname
    return host.split('.')[0] ?? null
  } catch {
    return null
  }
}

export function getAnonymousAuthDashboardUrl(): string | null {
  const ref = getSupabaseProjectRef()
  if (!ref) return null
  return `https://supabase.com/dashboard/project/${ref}/auth/providers`
}
