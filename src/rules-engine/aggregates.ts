import type { RoundComputed } from './round'
import type { Seat, Team } from './types'

/** A completed-or-not round with its seat→player mapping, for aggregation. */
export interface RoundForStats {
  computed: RoundComputed
  /** playerId in each seat for this round. */
  seatPlayers: Record<Seat, string>
  seatTeams: Record<Seat, Team>
}

export interface PlayerStats {
  playerId: string
  totalScore: number
  roundsPlayed: number
  roundsWon: number
  headCount: number // 头游次数
  avgScore: number
  winRate: number
}

export interface TodayOverview {
  totalRounds: number
  totalHands: number
  totalKang: number
  a3FailCount: number
  fastestRound: number | null // fewest hands
  slowestRound: number | null // most hands
}

/** Per-player daily stats. Only COMPLETE rounds count (spec §12/§13). */
export function playerStats(rounds: RoundForStats[]): PlayerStats[] {
  const acc = new Map<string, { score: number; rounds: number; wins: number; heads: number }>()
  const ensure = (id: string) => {
    let e = acc.get(id)
    if (!e) {
      e = { score: 0, rounds: 0, wins: 0, heads: 0 }
      acc.set(id, e)
    }
    return e
  }

  for (const r of rounds) {
    // 头游次数 counts every hand's 1st place, but only within complete rounds.
    if (r.computed.complete) {
      for (const hand of r.computed.hands) {
        const topSeat = ([0, 1, 2, 3] as Seat[]).find((s) => hand.input.ranks[s] === 1)!
        ensure(r.seatPlayers[topSeat]).heads += 1
      }
      const score = r.computed.score!
      for (const seat of [0, 1, 2, 3] as Seat[]) {
        const team = r.seatTeams[seat]
        const e = ensure(r.seatPlayers[seat])
        e.rounds += 1
        e.score += team === 'blue' ? score.blueScore : score.redScore
        if (score.winner === team) e.wins += 1
      }
    }
  }

  return [...acc.entries()].map(([playerId, e]) => ({
    playerId,
    totalScore: e.score,
    roundsPlayed: e.rounds,
    roundsWon: e.wins,
    headCount: e.heads,
    avgScore: e.rounds ? e.score / e.rounds : 0,
    winRate: e.rounds ? e.wins / e.rounds : 0,
  }))
}

/** 今日总览. Only COMPLETE rounds count (spec §15). */
export function todayOverview(rounds: RoundForStats[]): TodayOverview {
  const complete = rounds.filter((r) => r.computed.complete)
  const handCounts = complete.map((r) => r.computed.hands.length)
  let totalKang = 0
  let a3FailCount = 0
  for (const r of complete) {
    for (const hand of r.computed.hands) {
      if (hand.kangTeam) totalKang += 1
      if (hand.result === '退回2') a3FailCount += 1
    }
  }
  return {
    totalRounds: complete.length,
    totalHands: handCounts.reduce((a, b) => a + b, 0),
    totalKang,
    a3FailCount,
    fastestRound: handCounts.length ? Math.min(...handCounts) : null,
    slowestRound: handCounts.length ? Math.max(...handCounts) : null,
  }
}
