import { getAnonymousAuthDashboardUrl } from '../../lib/supabaseAuth'

interface SetupBannerProps {
  loading: boolean
  error?: string
  errorCode?: string
  libraryExercises?: number
  libraryMuscles?: number
  onInitialize: () => void
  onRetry: () => void
}

export function SetupBanner({
  loading,
  error,
  errorCode,
  libraryExercises = 0,
  libraryMuscles = 0,
  onInitialize,
  onRetry,
}: SetupBannerProps) {
  const authUrl = getAnonymousAuthDashboardUrl()
  const anonymousDisabled =
    errorCode === 'anonymous_provider_disabled' ||
    error?.toLowerCase().includes('anonymous sign-ins are disabled')

  return (
    <div className="mb-6 rounded-2xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/40 to-slate-950 p-6">
      <h2 className="text-lg font-bold text-white">Set up your program</h2>
      <p className="mt-2 text-sm text-slate-400">
        Load 14 workout sections (Chest, Back, Push, Pull, …) with exercises from the Supabase
        library
        {libraryExercises > 0
          ? ` (${libraryExercises} exercises, ${libraryMuscles} muscle groups)`
          : ''}
        . You can rename, add, and remove anything after.
      </p>

      {anonymousDisabled && (
        <div className="mt-4 rounded-lg border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-100">
          <p className="font-semibold text-amber-300">Anonymous sign-ins are off (422 error)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-amber-100/90">
            <li>Open Supabase → Authentication → Providers</li>
            <li>Find <strong>Anonymous</strong> and turn it <strong>ON</strong></li>
            <li>Click Save, then return here and press <strong>Retry connection</strong></li>
          </ol>
          {authUrl && (
            <a
              href={authUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-lg bg-amber-700/40 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-700/60"
            >
              Open Anonymous provider settings →
            </a>
          )}
        </div>
      )}

      {error && !anonymousDisabled && (
        <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {error && anonymousDisabled && (
        <p className="mt-3 text-xs text-slate-500">{error}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading || anonymousDisabled}
          onClick={onInitialize}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          title={anonymousDisabled ? 'Enable Anonymous auth first' : undefined}
        >
          {loading ? 'Setting up…' : 'Initialize 14 sections'}
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
        >
          Retry connection
        </button>
      </div>
    </div>
  )
}
