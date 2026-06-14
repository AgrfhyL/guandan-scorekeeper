import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anon) {
  console.warn('Supabase env vars not set — cloud sync disabled.')
}

export const supabase = url && anon ? createClient(url, anon) : null

// ─── helpers ────────────────────────────────────────────────────────────────

export async function callLock(body: {
  action: 'acquire' | 'refresh' | 'release'
  code: string
  password?: string
  token?: string
}): Promise<{ token?: string; expiresAt?: string; locked?: boolean; released?: boolean; error?: string }> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.functions.invoke('lock', { body })
  if (error) throw error
  return data
}

/** SHA-256 hex of a string (same algo as the Edge Function). */
export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
