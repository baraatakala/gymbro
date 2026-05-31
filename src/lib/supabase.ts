import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

/** Why cloud is disabled — differs for localhost vs GitHub Pages. */
export function supabaseConfigHint(): string {
  if (isSupabaseConfigured) return ''
  const onGithubPages =
    typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')
  if (onGithubPages) {
    return (
      'GitHub Actions needs secrets VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY ' +
      '(repo Settings → Secrets → Actions), then re-run “Deploy to GitHub Pages”.'
    )
  }
  return 'Copy .env.example to .env with your Supabase URL and key, then restart npm run dev.'
}

function createSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

export const supabase = createSupabaseClient()
