import { LEVEL_A, LEVEL_MIN, type Level, type Seat, type Team, type Rank, type HandShape } from './types'

/** Render a level as its card label: 2..10, J, Q, K, A. */
export function levelLabel(level: Level): string {
  if (level === 14) return 'A'
  if (level === 13) return 'K'
  if (level === 12) return 'Q'
  if (level === 11) return 'J'
  return String(level)
}

/** Advance a level by `amount`, capping at A (you cannot overshoot past A). */
export function advanceLevel(level: Level, amount: number): Level {
  return Math.min(LEVEL_A, Math.max(LEVEL_MIN, level + amount))
}

/** Seats belonging to a team given a seat→team map. */
export function seatsOfTeam(seatTeams: Record<Seat, Team>, team: Team): [Seat, Seat] {
  const seats = ([0, 1, 2, 3] as Seat[]).filter((s) => seatTeams[s] === team)
  return [seats[0], seats[1]]
}

export function otherTeam(team: Team): Team {
  return team === 'blue' ? 'red' : 'blue'
}

/** The team that finished first (头游). */
export function winnerTeam(ranks: [Rank, Rank, Rank, Rank], seatTeams: Record<Seat, Team>): Team {
  const topSeat = ([0, 1, 2, 3] as Seat[]).find((s) => ranks[s] === 1)!
  return seatTeams[topSeat]
}

/**
 * Shape from the winner (头游) team's perspective, by the partner's finishing rank:
 *  partner 2nd → 双上 (+3), 3rd → 单上 (+2), 4th → 单下 (+1).
 * The losing team's shape is the mirror (双下 only when winner is 双上).
 */
export function handShape(ranks: [Rank, Rank, Rank, Rank], seatTeams: Record<Seat, Team>): HandShape {
  const winner = winnerTeam(ranks, seatTeams)
  const [a, b] = seatsOfTeam(seatTeams, winner)
  const partnerSeat = ranks[a] === 1 ? b : a
  switch (ranks[partnerSeat]) {
    case 2:
      return '双上'
    case 3:
      return '单上'
    default:
      return '单下'
  }
}

/** Normal upgrade amount for a winning (头游) team by shape. */
export function upgradeAmount(shape: HandShape): number {
  switch (shape) {
    case '双上':
      return 3
    case '单上':
      return 2
    case '单下':
      return 1
    default:
      return 0 // 双下 never applies to the winner
  }
}
