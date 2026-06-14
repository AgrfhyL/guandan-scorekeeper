// Edge Function: editor lock management (spec §3).
// POST /functions/v1/lock  body: { action: 'acquire'|'refresh'|'release', code, password?, token? }
//
// acquire:  checks password hash, issues a new editor_token with a 90-second TTL.
//           If a lock already exists and is still valid, returns {locked: true}.
// refresh:  extends TTL by 90 seconds for a token that is still valid.
// release:  clears the lock for a valid token.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LOCK_TTL_SECONDS = 90
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { action, code, password, token } = await req.json()

  if (!code) return json({ error: 'code required' }, 400)

  const { data: match, error } = await supabase
    .from('matches')
    .select('id, password_hash, editor_token, editor_lock_expires_at, status')
    .eq('code', code)
    .single()

  if (error || !match) return json({ error: 'match not found' }, 404)
  if (match.status === 'ended') return json({ error: 'match ended' }, 400)

  const now = new Date()
  const lockValid = match.editor_token && match.editor_lock_expires_at && new Date(match.editor_lock_expires_at) > now

  if (action === 'acquire') {
    // Already locked by someone else — spectator mode.
    if (lockValid && match.editor_token !== token) {
      return json({ locked: true })
    }
    // Validate password.
    const hash = await sha256(password ?? '')
    if (hash !== match.password_hash) return json({ error: 'wrong password' }, 403)

    const newToken = crypto.randomUUID()
    const expires = new Date(now.getTime() + LOCK_TTL_SECONDS * 1000).toISOString()
    await supabase
      .from('matches')
      .update({ editor_token: newToken, editor_lock_expires_at: expires })
      .eq('id', match.id)

    return json({ token: newToken, expiresAt: expires })
  }

  if (action === 'refresh') {
    if (!token || match.editor_token !== token) return json({ error: 'invalid token' }, 403)
    const expires = new Date(now.getTime() + LOCK_TTL_SECONDS * 1000).toISOString()
    await supabase
      .from('matches')
      .update({ editor_lock_expires_at: expires })
      .eq('id', match.id)
    return json({ expiresAt: expires })
  }

  if (action === 'release') {
    if (!token || match.editor_token !== token) return json({ error: 'invalid token' }, 403)
    await supabase
      .from('matches')
      .update({ editor_token: null, editor_lock_expires_at: null })
      .eq('id', match.id)
    return json({ released: true })
  }

  return json({ error: 'unknown action' }, 400)
})

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
