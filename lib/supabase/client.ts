import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const isBrowser = typeof window !== 'undefined'
  const url = isBrowser
    ? `${window.location.origin}/supabase`
    : (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co')

  return createBrowserClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key',
    {
      auth: {
        storage: isBrowser ? window.sessionStorage : undefined,
      },
    }
  )
}