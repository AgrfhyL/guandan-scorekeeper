/**
 * Spectator: poll the cloud for match state every 10s (spec §16).
 * Refreshes only the data region; does not affect scroll/expanded UI state.
 */
import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { useMatchStore } from '@/store/matchStore'
import type { MatchState, RoundState } from '@/store/types'
import type { Rank, Team } from '@/rules-engine'

const POLL_MS = 10_000

export type SpectatorStatus = 'loading' | 'ok' | 'notfound' | 'unconfigured'

export function useSpectator(code: string) {
  const loadMatch = useMatchStore((s) => s.loadMatch)
  const match = useMatchStore((s) => s.match)
  const [status, setStatus] = useState<SpectatorStatus>('loading')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Last serialized snapshot — skip loadMatch when nothing changed so the UI
  // (scroll position, selected tab) is never disrupted by a no-op poll (spec §16).
  const lastRef = useRef<string>('')

  const fetchAndLoad = async () => {
    if (!supabase) {
      setStatus('unconfigured')
      return
    }
    const snapshot = await fetchMatchSnapshot(code)
    if (snapshot) {
      const serialized = JSON.stringify(snapshot)
      if (serialized !== lastRef.current) {
        lastRef.current = serialized
        loadMatch(snapshot)
      }
      setStatus('ok')
    } else {
      setStatus('notfound')
    }
  }

  useEffect(() => {
    fetchAndLoad()
    intervalRef.current = setInterval(fetchAndLoad, POLL_MS)

    const onVisible = () => { if (!document.hidden) fetchAndLoad() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return { match, status }
}

// ─── Load full match from Supabase ───────────────────────────────────────────

async function fetchMatchSnapshot(code: string): Promise<MatchState | null> {
  if (!supabase) return null

  const { data: m } = await supabase
    .from('matches')
    .select('id, code, date, location, status')
    .eq('code', code)
    .single()
  if (!m) return null

  const { data: players } = await supabase
    .from('players')
    .select('id, name')
    .eq('match_id', m.id)

  const { data: roundRows } = await supabase
    .from('rounds')
    .select('id, idx, first_dealer, status')
    .eq('match_id', m.id)
    .order('idx')

  const rounds: RoundState[] = []
  for (const r of roundRows ?? []) {
    const { data: seats } = await supabase
      .from('round_seats')
      .select('seat, player_id')
      .eq('round_id', r.id)
      .order('seat')

    const { data: handRows } = await supabase
      .from('hands')
      .select('idx, rank_seat0, rank_seat1, rank_seat2, rank_seat3, kang_gong')
      .eq('round_id', r.id)
      .order('idx')

    const seatArr: [string, string, string, string] = ['', '', '', '']
    for (const s of seats ?? []) seatArr[s.seat as 0 | 1 | 2 | 3] = s.player_id

    rounds.push({
      id: r.id,
      firstDealer: r.first_dealer as Team,
      seats: seatArr,
      status: r.status,
      hands: (handRows ?? []).map((h) => ({
        ranks: [h.rank_seat0, h.rank_seat1, h.rank_seat2, h.rank_seat3] as [Rank, Rank, Rank, Rank],
        kangGong: h.kang_gong,
      })),
    })
  }

  return {
    code: m.code,
    password: '', // never exposed to spectators
    date: m.date,
    location: m.location,
    status: m.status,
    players: (players ?? []).map((p) => ({ id: p.id, name: p.name })),
    rounds,
  }
}
