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
    <div className="glass-panel-strong mb-6 overflow-hidden border-emerald-500/25 bg-gradient-to-br from-emerald-950/50 via-slate-900/30 to-slate-950/80 p-6 sm:p-8">
      <h2 className="text-xl font-bold text-white sm:text-2xl">Set up your program</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
        Load 14 workout sections (Chest, Back, Push, Pull, …) with exercises from the Supabase
        library
        {libraryExercises > 0
          ? ` (${libraryExercises} exercises, ${libraryMuscles} muscle groups)`
          : ''}
        . You can rename, add, and remove anything after.
      </p>

      {anonymousDisabled && (
        <div className="mt-5 rounded-xl border border-amber-600/40 bg-amber-950/40 p-4 text-sm text-amber-100">
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
              className="btn-secondary mt-4 inline-flex border-amber-700/50 text-amber-100"
            >
              Open Anonymous provider settings →
            </a>
          )}
        </div>
      )}

      {error && !anonymousDisabled && (
        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={loading || anonymousDisabled}
          onClick={onInitialize}
          className="btn-primary w-full sm:w-auto sm:px-8"
          title={anonymousDisabled ? 'Enable Anonymous auth first' : undefined}
        >
          {loading ? 'Setting up…' : 'Initialize 14 sections'}
        </button>
        <button type="button" onClick={onRetry} className="btn-secondary w-full sm:w-auto">
          Retry connection
        </button>
      </div>
    </div>
  )
}
