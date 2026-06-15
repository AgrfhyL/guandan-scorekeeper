import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HandInput, MatchState, Player, RoundState } from './types'
import type { Seat, Team } from '@/rules-engine'
import type { ToastMessage } from '@/components/Toast'

let idCounter = 0
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${idCounter++}`

interface MatchStore {
  match: MatchState | null
  lockedOut: boolean
  toasts: ToastMessage[]

  createMatch: (init: {
    code: string
    password: string
    date: string
    location: string
    playerNames: [string, string, string, string]
  }) => void
  loadMatch: (match: MatchState) => void
  clear: () => void

  /** Resolve a typed name to a player id, merging by name within the match (spec §4). */
  resolvePlayer: (name: string) => string
  /**
   * Put a (new or existing) player in a seat of the latest round (spec §9 overhaul).
   * The previously-seated player is NOT deleted and past rounds are untouched, so every
   * player's historical data is retained and shown on the leaderboard.
   */
  assignSeatPlayer: (seat: Seat, name: string) => void
  setFirstDealer: (roundId: string, team: Team) => void

  /** Append a completed hand to the active round. */
  addHand: (roundId: string, hand: HandInput) => void
  /** Replace a hand's input (history edit, spec §10). */
  editHand: (roundId: string, handIndex: number, hand: HandInput) => void
  removeLastHand: (roundId: string) => void

  startRound: (firstDealer: Team | null, seats: [string, string, string, string]) => string
  setRoundStatus: (roundId: string, status: RoundState['status']) => void
  endMatch: () => void

  setLockedOut: (locked: boolean) => void
  addToast: (text: string, type?: 'info' | 'error' | 'warning') => void
  removeToast: (id: string) => void
}

function findByName(players: Player[], name: string): Player | undefined {
  return players.find((p) => p.name === name.trim())
}

export const useMatchStore = create<MatchStore>()(
  persist(
    (set, get) => ({
      match: null,
      lockedOut: false,
      toasts: [],

      createMatch: ({ code, password, date, location, playerNames }) => {
        const players: Player[] = []
        const seatIds = playerNames.map((name) => {
          const existing = findByName(players, name)
          if (existing) return existing.id
          const p = { id: newId('p'), name: name.trim() }
          players.push(p)
          return p.id
        }) as [string, string, string, string]

        const round: RoundState = {
          id: newId('r'),
          firstDealer: null,
          seats: seatIds,
          hands: [],
          status: 'active',
        }
        set({
          match: { code, password, date, location, players, rounds: [round], status: 'active' },
        })
      },

      loadMatch: (match) => set({ match }),
      clear: () => set({ match: null }),

      resolvePlayer: (name) => {
        const match = get().match!
        const existing = findByName(match.players, name)
        if (existing) return existing.id
        const p = { id: newId('p'), name: name.trim() }
        set({ match: { ...match, players: [...match.players, p] } })
        return p.id
      },

      assignSeatPlayer: (seat, name) => {
        const match = get().match!
        const trimmed = name.trim()
        if (!trimmed || match.rounds.length === 0) return

        // Resolve the target player: reuse an existing same-name player (§4), else create a new one.
        let players = match.players
        let targetId = findByName(players, trimmed)?.id
        if (!targetId) {
          const p = { id: newId('p'), name: trimmed }
          players = [...players, p]
          targetId = p.id
        }

        // Reassign ONLY the latest round's seat. The previously-seated player stays in the roster
        // and all past rounds keep their original seating, preserving every player's history (§9).
        const lastIdx = match.rounds.length - 1
        const rounds = match.rounds.map((r, i) => {
          if (i !== lastIdx) return r
          const seats = [...r.seats] as RoundState['seats']
          seats[seat] = targetId!
          return { ...r, seats }
        })
        set({ match: { ...match, players, rounds } })
      },

      setFirstDealer: (roundId, team) => {
        const match = get().match!
        set({
          match: {
            ...match,
            rounds: match.rounds.map((r) => (r.id === roundId ? { ...r, firstDealer: team } : r)),
          },
        })
      },

      addHand: (roundId, hand) => {
        const match = get().match!
        set({
          match: {
            ...match,
            rounds: match.rounds.map((r) =>
              r.id === roundId ? { ...r, hands: [...r.hands, hand] } : r,
            ),
          },
        })
      },

      editHand: (roundId, handIndex, hand) => {
        const match = get().match!
        set({
          match: {
            ...match,
            rounds: match.rounds.map((r) =>
              r.id === roundId
                ? { ...r, hands: r.hands.map((h, i) => (i === handIndex ? hand : h)) }
                : r,
            ),
          },
        })
      },

      removeLastHand: (roundId) => {
        const match = get().match!
        set({
          match: {
            ...match,
            rounds: match.rounds.map((r) =>
              r.id === roundId ? { ...r, hands: r.hands.slice(0, -1) } : r,
            ),
          },
        })
      },

      startRound: (firstDealer, seats) => {
        const match = get().match!
        const round: RoundState = { id: newId('r'), firstDealer, seats, hands: [], status: 'active' }
        set({ match: { ...match, rounds: [...match.rounds, round] } })
        return round.id
      },

      setRoundStatus: (roundId, status) => {
        const match = get().match!
        set({
          match: {
            ...match,
            rounds: match.rounds.map((r) => (r.id === roundId ? { ...r, status } : r)),
          },
        })
      },

      endMatch: () => {
        const match = get().match!
        set({ match: { ...match, status: 'ended' } })
      },

      setLockedOut: (locked) => set({ lockedOut: locked }),

      addToast: (text, type = 'info') => {
        const id = `toast_${Date.now()}_${Math.random()}`
        const newToast: ToastMessage = { id, text, type }
        set((s) => ({ toasts: [...s.toasts, newToast] }))
      },

      removeToast: (id) => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      },
    }),
    { name: 'guandan-match' },
  ),
)
