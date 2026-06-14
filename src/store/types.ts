import type { HandInput, Seat, Team } from '@/rules-engine'

export interface Player {
  id: string
  name: string
}

export interface RoundState {
  id: string
  firstDealer: Team
  /** playerId in each seat (0&2 = blue, 1&3 = red). */
  seats: [string, string, string, string]
  hands: HandInput[]
  status: 'active' | 'complete' | 'incomplete'
}

export interface MatchState {
  code: string
  password: string
  date: string // YYYY-MM-DD
  location: string
  players: Player[]
  rounds: RoundState[]
  status: 'active' | 'ended'
}

/** Fixed seat→team map: opposite seats are partners. */
export const SEAT_TEAMS: Record<Seat, Team> = { 0: 'blue', 1: 'red', 2: 'blue', 3: 'red' }

export type { HandInput }
