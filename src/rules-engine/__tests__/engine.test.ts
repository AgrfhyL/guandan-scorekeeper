import { describe, it, expect } from 'vitest'
import {
  handShape,
  roundScore,
  tributeDescriptor,
  resolveHand,
  computeRound,
  playerStats,
  todayOverview,
  initialLevelState,
  type Rank,
  type Seat,
  type Team,
  type HandInput,
  type LevelState,
} from '../index'
import type { RoundForStats } from '../aggregates'

// Standard table: seats 0 & 2 = blue, seats 1 & 3 = red (opposite seats are partners).
const ST: Record<Seat, Team> = { 0: 'blue', 1: 'red', 2: 'blue', 3: 'red' }
const ranks = (a: number, b: number, c: number, d: number) => [a, b, c, d] as [Rank, Rank, Rank, Rank]
const hand = (r: [Rank, Rank, Rank, Rank], kangGong = false): HandInput => ({ ranks: r, kangGong })

describe('handShape', () => {
  it('双上: blue takes 1st + 2nd', () => {
    expect(handShape(ranks(1, 3, 2, 4), ST)).toBe('双上')
  })
  it('单上: blue 1st, partner 3rd', () => {
    expect(handShape(ranks(1, 2, 3, 4), ST)).toBe('单上')
  })
  it('单下: blue 1st, partner 4th (last)', () => {
    expect(handShape(ranks(1, 2, 4, 3), ST)).toBe('单下')
  })
})

describe('roundScore (52 + 4×级差)', () => {
  it('级差0 → 52/48', () => {
    const s = roundScore('blue', 14, 14)
    expect(s.blueScore).toBe(52)
    expect(s.redScore).toBe(48)
  })
  it('级差1 → 56/44', () => {
    expect(roundScore('blue', 14, 13).blueScore).toBe(56)
  })
  it('级差12 → 100/0 (max)', () => {
    const s = roundScore('red', 14, 2)
    expect(s.redScore).toBe(100)
    expect(s.blueScore).toBe(0)
  })
})

describe('tributeDescriptor', () => {
  it('单贡: 末游 → 头游 when not a double-down', () => {
    // blue 1st(seat0)+3rd(seat2); red 2nd(seat1)+4th(seat3). Loser red is NOT both 三/末.
    const t = tributeDescriptor(ranks(1, 2, 3, 4), ST)
    expect(t).toEqual({ kind: 'single', fromSeat: 3, toSeat: 0 })
  })
  it('双贡: losing team holds both 三游 + 末游', () => {
    // blue 1st(seat0)+2nd(seat2) = 双上; red 3rd(seat1)+4th(seat3) = 双下 → double tribute.
    const t = tributeDescriptor(ranks(1, 3, 2, 4), ST)
    expect(t).toEqual({ kind: 'double', fromTeam: 'red', toTeam: 'blue' })
  })
  it('单下: intra-team tribute (winner partner is last) still 末游 → 头游', () => {
    // blue 1st(seat0)+4th(seat2). Last seat is blue's own player.
    const t = tributeDescriptor(ranks(1, 2, 4, 3), ST)
    expect(t).toEqual({ kind: 'single', fromSeat: 2, toSeat: 0 })
  })
})

describe('resolveHand — ordinary upgrades', () => {
  const base = initialLevelState('blue') // both at 2, blue leads
  it('双上 → winner +3, becomes leading, result 赢 when leader wins', () => {
    const r = resolveHand(base, ST, hand(ranks(1, 3, 2, 4)))
    expect(r.winner).toBe('blue')
    expect(r.stateAfter.blueLevel).toBe(5)
    expect(r.stateAfter.leading).toBe('blue')
    expect(r.result).toBe('赢')
  })
  it('单上 → +2', () => {
    expect(resolveHand(base, ST, hand(ranks(1, 2, 3, 4))).stateAfter.blueLevel).toBe(4)
  })
  it('单下 → +1', () => {
    expect(resolveHand(base, ST, hand(ranks(1, 2, 4, 3))).stateAfter.blueLevel).toBe(3)
  })
  it('leader loses → result 输, other team leads', () => {
    const r = resolveHand(base, ST, hand(ranks(2, 1, 4, 3))) // red 1st
    expect(r.winner).toBe('red')
    expect(r.stateAfter.leading).toBe('red')
    expect(r.result).toBe('输')
  })
  it('advancing caps at A and opens attempt', () => {
    const s: LevelState = { ...base, blueLevel: 13 } // K
    const r = resolveHand(s, ST, hand(ranks(1, 3, 2, 4))) // +3 → caps at 14
    expect(r.stateAfter.blueLevel).toBe(14)
    expect(r.stateAfter.blueAAttempt).toBe(1)
  })
})

describe('resolveHand — 打A pass/fail', () => {
  const atA: LevelState = { blueLevel: 14, redLevel: 10, blueAAttempt: 1, redAAttempt: 0, leading: 'blue' }
  it('双上 at A → round win 胜', () => {
    const r = resolveHand(atA, ST, hand(ranks(1, 3, 2, 4)))
    expect(r.roundOver).toBe(true)
    expect(r.result).toBe('胜')
    expect(r.winner).toBe('blue')
  })
  it('单上 at A → round win', () => {
    expect(resolveHand(atA, ST, hand(ranks(1, 2, 3, 4))).roundOver).toBe(true)
  })
  it('单下 at A → 未过, attempt advances, opponent unchanged, A-team keeps leading', () => {
    const r = resolveHand(atA, ST, hand(ranks(1, 2, 4, 3)))
    expect(r.result).toBe('未过')
    expect(r.stateAfter.blueAAttempt).toBe(2)
    expect(r.stateAfter.redLevel).toBe(10) // opponent does NOT advance
    expect(r.stateAfter.leading).toBe('blue') // A-team keeps declaring
  })
  it('双下 at A (opponent 双上) → 未过, opponent +3', () => {
    const r = resolveHand(atA, ST, hand(ranks(3, 1, 4, 2))) // red 1st+2nd
    expect(r.result).toBe('未过')
    expect(r.stateAfter.redLevel).toBe(13)
    expect(r.stateAfter.blueAAttempt).toBe(2)
  })
  it('A3 双下 fail → 退回2, opponent advances and leads', () => {
    const a3: LevelState = { ...atA, blueAAttempt: 3 }
    const r = resolveHand(a3, ST, hand(ranks(3, 1, 4, 2))) // red 双上
    expect(r.result).toBe('退回2')
    expect(r.roundOver).toBe(false)
    expect(r.stateAfter.blueLevel).toBe(2)
    expect(r.stateAfter.blueAAttempt).toBe(0)
    expect(r.stateAfter.redLevel).toBe(13) // +3
    expect(r.stateAfter.leading).toBe('red')
  })
  it('A3 单下 fail → 退回2, challenger keeps leading (deals 2 next)', () => {
    const a3: LevelState = { ...atA, blueAAttempt: 3 }
    const r = resolveHand(a3, ST, hand(ranks(1, 2, 4, 3))) // blue 头游+末游
    expect(r.result).toBe('退回2')
    expect(r.stateAfter.blueLevel).toBe(2)
    expect(r.stateAfter.redLevel).toBe(10) // opponent unchanged
    expect(r.stateAfter.leading).toBe('blue')
  })
})

describe('computeRound + aggregates', () => {
  it('runs a round to a 过A win and scores it', () => {
    // Force blue to A quickly then pass.
    const inputs: HandInput[] = [
      hand(ranks(1, 3, 2, 4)), // blue 2→5
      hand(ranks(1, 3, 2, 4)), // 5→8
      hand(ranks(1, 3, 2, 4)), // 8→11
      hand(ranks(1, 3, 2, 4)), // 11→14 (A, attempt1)
      hand(ranks(1, 3, 2, 4)), // pass A → win
    ]
    const rc = computeRound(ST, 'blue', inputs)
    expect(rc.complete).toBe(true)
    expect(rc.score?.winner).toBe('blue')
    // blue 14 vs red 2 → 级差12 → 100/0
    expect(rc.score?.blueScore).toBe(100)
  })

  it('player stats credit full team score to both players; incomplete excluded', () => {
    const inputs: HandInput[] = [
      hand(ranks(1, 3, 2, 4)),
      hand(ranks(1, 3, 2, 4)),
      hand(ranks(1, 3, 2, 4)),
      hand(ranks(1, 3, 2, 4)),
      hand(ranks(1, 3, 2, 4)),
    ]
    const computed = computeRound(ST, 'blue', inputs)
    const rounds: RoundForStats[] = [
      { computed, seatPlayers: { 0: 'A', 1: 'B', 2: 'C', 3: 'D' }, seatTeams: ST },
      // an incomplete round (no win) must not count
      { computed: computeRound(ST, 'blue', [hand(ranks(1, 3, 2, 4))]), seatPlayers: { 0: 'A', 1: 'B', 2: 'C', 3: 'D' }, seatTeams: ST },
    ]
    const stats = playerStats(rounds)
    const a = stats.find((s) => s.playerId === 'A')!
    const c = stats.find((s) => s.playerId === 'C')!
    expect(a.totalScore).toBe(100)
    expect(c.totalScore).toBe(100) // full score, not split
    expect(a.roundsPlayed).toBe(1) // incomplete excluded
    expect(a.roundsWon).toBe(1)
    expect(a.headCount).toBe(5) // blue seat0 1st every hand, complete round only

    const ov = todayOverview(rounds)
    expect(ov.totalRounds).toBe(1)
    expect(ov.totalHands).toBe(5)
    expect(ov.fastestRound).toBe(5)
  })
})
