/**
 * Cloud autosave + editor lock for the active match (spec §3, §17, §18).
 *
 * Strategy:
 *  - On mount, acquire the editor lock (password required). If locked → spectator.
 *  - Heartbeat every 60s to refresh the lock TTL (TTL = 90s on the server).
 *  - On every match state change, debounce 1.5s then push a full snapshot to Supabase.
 *  - On network failure, keep local state and retry on: restore / foreground / next change.
 *  - SaveStatus drives the subtle indicator in the UI.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase, callLock, sha256 } from './supabase'
import { useMatchStore } from '@/store/matchStore'
import type { MatchState, RoundState } from '@/store/types'

export type SaveStatus = 'saved' | 'saving' | 'error' | 'offline'

interface UseSyncResult {
  saveStatus: SaveStatus
  isEditor: boolean
  syncNow: () => Promise<void>
}

const DEBOUNCE_MS = 1500
const HEARTBEAT_MS = 60_000

export function useMatchSync(password: string | null): UseSyncResult {
  const match = useMatchStore((s) => s.match)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [isEditor, setIsEditor] = useState(false)
  const tokenRef = useRef<string | null>(null)
  const pendingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Acquire lock on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase || !match || !password) return

    // Seed the match row first so the lock Edge Function can find it.
    // The lock function does SELECT by code — if the row doesn't exist yet it returns
    // 404 and we'd never become editor. Upsert is safe to call with anon key (INSERT
    // policy applied). We don't need to be editor yet for this write.
    async function acquireWithSeed() {
      const pwhash = await sha256(password!)
      await supabase!.from('matches').upsert(
        {
          code: match!.code,
          password_hash: pwhash,
          date: match!.date,
          location: match!.location,
          status: match!.status,
        },
        { onConflict: 'code' },
      )
      const res = await callLock({ action: 'acquire', code: match!.code, password: password! })
      if (res.locked) {
        setIsEditor(false)
      } else if (res.token) {
        tokenRef.current = res.token
        setIsEditor(true)
      }
    }

    acquireWithSeed().catch(() => setIsEditor(false))

    return () => {
      if (tokenRef.current && match) {
        callLock({ action: 'release', code: match.code, token: tokenRef.current }).catch(() => {})
        tokenRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditor || !match) return
    const id = setInterval(() => {
      if (!tokenRef.current) return
      callLock({ action: 'refresh', code: match.code, token: tokenRef.current }).catch(() => {})
    }, HEARTBEAT_MS)
    return () => clearInterval(id)
  }, [isEditor, match])

  // ── Push full match snapshot ───────────────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (!supabase || !match || !isEditor) return
    setSaveStatus('saving')
    try {
      await pushSnapshot(match)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [match, isEditor])

  // ── Debounced autosave on state change ────────────────────────────────────
  useEffect(() => {
    if (!isEditor || !match) return
    if (timerRef.current) clearTimeout(timerRef.current)
    pendingRef.current = true
    timerRef.current = setTimeout(() => {
      pendingRef.current = false
      syncNow()
    }, DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [match, isEditor, syncNow])

  // ── Retry on foreground / online ──────────────────────────────────────────
  useEffect(() => {
    const retry = () => { if (saveStatus === 'error' && isEditor) syncNow() }
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) retry() })
    return () => { window.removeEventListener('online', retry) }
  }, [saveStatus, isEditor, syncNow])

  return { saveStatus, isEditor, syncNow }
}

// ─── Snapshot push (upsert full match) ───────────────────────────────────────

async function pushSnapshot(match: MatchState) {
  if (!supabase) throw new Error('no supabase')
  const pwhash = await sha256(match.password)

  // Upsert match row.
  const { error: mErr } = await supabase.from('matches').upsert(
    {
      code: match.code,
      password_hash: pwhash,
      date: match.date,
      location: match.location,
      status: match.status,
      ended_at: match.status === 'ended' ? new Date().toISOString() : null,
    },
    { onConflict: 'code' },
  )
  if (mErr) throw mErr

  // Fetch match id.
  const { data: mRow } = await supabase.from('matches').select('id').eq('code', match.code).single()
  if (!mRow) throw new Error('match row missing')
  const matchId = mRow.id

  // Upsert players.
  for (const p of match.players) {
    await supabase.from('players').upsert({ id: p.id, match_id: matchId, name: p.name }, { onConflict: 'id' })
  }

  // Upsert rounds, seats, hands.
  for (const [rIdx, round] of match.rounds.entries()) {
    await pushRound(matchId, rIdx, round, match)
  }
}

async function pushRound(matchId: string, rIdx: number, round: RoundState, _match: MatchState) {
  if (!supabase) return

  // Resolve player UUIDs from store ids — we use the store id as the DB uuid directly.
  const { error: rErr } = await supabase.from('rounds').upsert(
    { id: round.id, match_id: matchId, idx: rIdx, first_dealer: round.firstDealer ?? 'blue', status: round.status },
    { onConflict: 'id' },
  )
  if (rErr) throw rErr

  // Upsert seats.
  for (let seat = 0; seat < 4; seat++) {
    await supabase.from('round_seats').upsert(
      { round_id: round.id, seat, player_id: round.seats[seat] },
      { onConflict: 'round_id,seat' },
    )
  }

  // Upsert hands.
  for (const [hIdx, hand] of round.hands.entries()) {
    const handId = `${round.id}_${hIdx}`
    await supabase.from('hands').upsert(
      {
        id: handId,
        round_id: round.id,
        idx: hIdx,
        rank_seat0: hand.ranks[0],
        rank_seat1: hand.ranks[1],
        rank_seat2: hand.ranks[2],
        rank_seat3: hand.ranks[3],
        kang_gong: hand.kangGong,
      },
      { onConflict: 'id' },
    )
  }
}
