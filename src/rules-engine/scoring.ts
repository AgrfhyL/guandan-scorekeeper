import type { Level, Team } from './types'

export interface RoundScore {
  winner: Team
  blueScore: number
  redScore: number
}

/**
 * Round scoring (rules §三), applied only when a round completes (someone 过A).
 *   winnerScore = 52 + 4 × (winnerLevel − loserLevel)  [级差: A=14 … 2=2]
 *   loserScore  = 100 − winnerScore
 * Range: 级差0 → 52/48, 级差1 → 56/44, 级差12 → 100/0.
 */
export function roundScore(winner: Team, winnerLevel: Level, loserLevel: Level): RoundScore {
  const winnerScore = 52 + 4 * (winnerLevel - loserLevel)
  const loserScore = 100 - winnerScore
  return winner === 'blue'
    ? { winner, blueScore: winnerScore, redScore: loserScore }
    : { winner, blueScore: loserScore, redScore: winnerScore }
}
