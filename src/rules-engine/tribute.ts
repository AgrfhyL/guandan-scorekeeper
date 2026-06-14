import { otherTeam } from './levels'
import type { Rank, Seat, Team, TributeDescriptor } from './types'

/**
 * Derive the 进贡 (tribute) descriptor owed for the NEXT hand from this hand's ranks
 * (rules §二.2/3, spec §10). Display only — the engine does not know cards.
 *
 *  - 单贡: the team that won (头游) is split (单上/单下/单游) → the 末游 player tributes to the 头游 player.
 *  - 双贡: when one team took BOTH 三游 + 末游 (i.e. the opponents took 头游 + 二游 / 双上),
 *          that whole team tributes → shown as team-dot → team-dot.
 */
export function tributeDescriptor(
  ranks: [Rank, Rank, Rank, Rank],
  seatTeams: Record<Seat, Team>,
): TributeDescriptor {
  const seatByRank = (r: Rank): Seat => ([0, 1, 2, 3] as Seat[]).find((s) => ranks[s] === r)!
  const topSeat = seatByRank(1)
  const lastSeat = seatByRank(4)
  const thirdSeat = seatByRank(3)

  const winningTeam = seatTeams[topSeat]
  // 双下 for the losing team = they hold both 三游 and 末游.
  const losingTeam = otherTeam(winningTeam)
  const losersAreThirdAndLast = seatTeams[thirdSeat] === losingTeam && seatTeams[lastSeat] === losingTeam

  if (losersAreThirdAndLast) {
    return { kind: 'double', fromTeam: losingTeam, toTeam: winningTeam }
  }
  return { kind: 'single', fromSeat: lastSeat, toSeat: topSeat }
}

/**
 * The team credited with a 抗贡 when the flag is set (spec §9): always the *tributing* side.
 * For 双贡 that is the losing team; for 单贡 it is the 末游 player's team (even if it is an
 * intra-team tribute, it still counts for that player's team).
 */
export function kangTeam(descriptor: TributeDescriptor, seatTeams: Record<Seat, Team>): Team | null {
  switch (descriptor.kind) {
    case 'none':
      return null
    case 'double':
      return descriptor.fromTeam
    case 'single':
      return seatTeams[descriptor.fromSeat]
  }
}
