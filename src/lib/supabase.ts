import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function buildClient(): SupabaseClient {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_client) _client = buildClient()
    return Reflect.get(_client, prop)
  },
})
