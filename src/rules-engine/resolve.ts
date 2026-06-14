import { advanceLevel, handShape, otherTeam, upgradeAmount, winnerTeam } from './levels'
import { tributeDescriptor } from './tribute'
import {
  LEVEL_A,
  LEVEL_MIN,
  type HandInput,
  type HandResult,
  type LevelState,
  type Seat,
  type Team,
} from './types'

/**
 * 打A fail behaviour (confirmed with client):
 *  - 单下 at A (头游+末游 — A-team got 头游 but partner last): the opponent does NOT advance and
 *    the A-team keeps declaring (主打方 stays); only the A attempt is consumed (A1→A2→A3).
 *  - Any other fail (A-team did not get 头游, e.g. 双下): the opponent holds 头游 and advances by
 *    its normal upgrade amount, and the opponent becomes 主打方.
 * On an A3 fail the A-team retreats to level 2; 主打方 follows the same rule (规则 §二.7 A3 special).
 */

function levelOf(state: LevelState, team: Team): number {
  return team === 'blue' ? state.blueLevel : state.redLevel
}
function attemptOf(state: LevelState, team: Team): 0 | 1 | 2 | 3 {
  return team === 'blue' ? state.blueAAttempt : state.redAAttempt
}

function withLevel(state: LevelState, team: Team, level: number): LevelState {
  return team === 'blue' ? { ...state, blueLevel: level } : { ...state, redLevel: level }
}
function withAttempt(state: LevelState, team: Team, attempt: 0 | 1 | 2 | 3): LevelState {
  return team === 'blue' ? { ...state, blueAAttempt: attempt } : { ...state, redAAttempt: attempt }
}

/** The team currently challenging A (level === A and attempt >= 1), or null. */
function teamAtA(state: LevelState): Team | null {
  if (state.blueLevel === LEVEL_A && state.blueAAttempt >= 1) return 'blue'
  if (state.redLevel === LEVEL_A && state.redAAttempt >= 1) return 'red'
  return null
}

/** Advance a team's level; if it reaches A for the first time, open its A1 attempt. */
function applyAdvance(state: LevelState, team: Team, amount: number): LevelState {
  const next = advanceLevel(levelOf(state, team), amount)
  let s = withLevel(state, team, next)
  if (next === LEVEL_A && attemptOf(state, team) === 0) {
    s = withAttempt(s, team, 1)
  }
  return s
}

/**
 * Resolve a single hand: given the level/attempt state going in and the seat→team map,
 * derive the winner, shape, tribute owed for the next hand, the new state, and the result code.
 *
 * Implements the upgrade rules (规则 §二.7) and the 打A three-chance machine (规则 §二.7 打A特殊).
 */
export function resolveHand(
  state: LevelState,
  seatTeams: Record<Seat, Team>,
  input: HandInput,
): HandResult {
  const winner = winnerTeam(input.ranks, seatTeams)
  const shape = handShape(input.ranks, seatTeams)
  const tributeForNext = tributeDescriptor(input.ranks, seatTeams)
  // incomingTribute + kangTeam are filled by the round runner (they need the previous hand).
  const incomingTribute: HandResult['incomingTribute'] = { kind: 'none' }
  const kang: Team | null = null

  const aTeam = teamAtA(state)

  // ---- No team at A: ordinary upgrade. The 头游 team advances and becomes 主打方. ----
  if (!aTeam) {
    const after0 = applyAdvance(state, winner, upgradeAmount(shape))
    const after: LevelState = { ...after0, leading: winner }
    return {
      input,
      stateBefore: state,
      stateAfter: after,
      winner,
      shape,
      tributeForNext,
      incomingTribute,
      kangTeam: kang,
      roundOver: false,
      result: state.leading === winner ? '赢' : '输',
    }
  }

  // ---- A team is challenging. ----
  const opp = otherTeam(aTeam)
  const aWonHead = winner === aTeam
  const aPass = aWonHead && (shape === '双上' || shape === '单上')

  if (aPass) {
    // 过A — round ends, this team wins.
    return {
      input,
      stateBefore: state,
      stateAfter: { ...state, leading: aTeam },
      winner: aTeam,
      shape,
      tributeForNext,
      incomingTribute,
      kangTeam: kang,
      roundOver: true,
      result: '胜',
    }
  }

  // A challenge failed this hand.
  //  - 单下 (aWonHead): opponent does NOT advance, A-team keeps declaring.
  //  - otherwise: opponent holds 头游, advances normally, and becomes 主打方.
  let after = aWonHead ? state : applyAdvance(state, opp, upgradeAmount(shape))
  const nextLeading: Team = aWonHead ? aTeam : opp

  const usedAttempt = attemptOf(state, aTeam)
  if (usedAttempt >= 3) {
    // A3 failed → this team retreats to 2 (round continues).
    after = withLevel(after, aTeam, LEVEL_MIN)
    after = withAttempt(after, aTeam, 0)
    after = { ...after, leading: nextLeading }
    return {
      input,
      stateBefore: state,
      stateAfter: after,
      winner,
      shape,
      tributeForNext,
      incomingTribute,
      kangTeam: kang,
      roundOver: false,
      result: '退回2',
    }
  }

  // A1/A2 failed → consume one attempt, stay at A.
  after = withAttempt(after, aTeam, (usedAttempt + 1) as 1 | 2 | 3)
  after = { ...after, leading: nextLeading }
  return {
    input,
    stateBefore: state,
    stateAfter: after,
    winner,
    shape,
    tributeForNext,
    incomingTribute,
    kangTeam: kang,
    roundOver: false,
    result: '未过',
  }
}
