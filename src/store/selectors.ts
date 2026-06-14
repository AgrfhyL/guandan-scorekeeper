import {
  computeRound,
  playerStats,
  todayOverview,
  type PlayerStats,
  type RoundComputed,
  type Seat,
} from '@/rules-engine'
import type { RoundForStats } from '@/rules-engine/aggregates'
import { SEAT_TEAMS, type MatchState, type RoundState } from './types'

export function computeRoundState(round: RoundState): RoundComputed {
  return computeRound(SEAT_TEAMS, round.firstDealer, round.hands)
}

/** A round counts as complete for stats only if it actually reached a 过A win. */
export function isRoundComplete(round: RoundState): boolean {
  return computeRoundState(round).complete
}

function toRoundForStats(round: RoundState): RoundForStats {
  return {
    computed: computeRoundState(round),
    seatPlayers: {
      0: round.seats[0],
      1: round.seats[1],
      2: round.seats[2],
      3: round.seats[3],
    } as Record<Seat, string>,
    seatTeams: SEAT_TEAMS,
  }
}

export function matchPlayerStats(match: MatchState): PlayerStats[] {
  return playerStats(match.rounds.map(toRoundForStats))
}

export function matchOverview(match: MatchState) {
  return todayOverview(match.rounds.map(toRoundForStats))
}

export function playerName(match: MatchState, id: string): string {
  return match.players.find((p) => p.id === id)?.name ?? '—'
}
