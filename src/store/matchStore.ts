import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HandInput, MatchState, Player, RoundState } from './types'
import type { Team } from '@/rules-engine'

let idCounter = 0
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${idCounter++}`

interface MatchStore {
  match: MatchState | null

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
  renamePlayer: (playerId: string, name: string) => void

  /** Append a completed hand to the active round. */
  addHand: (roundId: string, hand: HandInput) => void
  /** Replace a hand's input (history edit, spec §10). */
  editHand: (roundId: string, handIndex: number, hand: HandInput) => void
  removeLastHand: (roundId: string) => void

  startRound: (firstDealer: Team, seats: [string, string, string, string]) => string
  setRoundStatus: (roundId: string, status: RoundState['status']) => void
  endMatch: () => void
}

function findByName(players: Player[], name: string): Player | undefined {
  return players.find((p) => p.name === name.trim())
}

export const useMatchStore = create<MatchStore>()(
  persist(
    (set, get) => ({
      match: null,

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
          firstDealer: 'blue',
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

      renamePlayer: (playerId, name) => {
        const match = get().match!
        const trimmed = name.trim()
        // Merge into an existing player with the same name (spec §4).
        const existing = match.players.find((p) => p.name === trimmed && p.id !== playerId)
        if (existing) {
          const rounds = match.rounds.map((r) => ({
            ...r,
            seats: r.seats.map((s) => (s === playerId ? existing.id : s)) as RoundState['seats'],
          }))
          const players = match.players.filter((p) => p.id !== playerId)
          set({ match: { ...match, players, rounds } })
        } else {
          const players = match.players.map((p) => (p.id === playerId ? { ...p, name: trimmed } : p))
          set({ match: { ...match, players } })
        }
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
    }),
    { name: 'guandan-match' },
  ),
)
