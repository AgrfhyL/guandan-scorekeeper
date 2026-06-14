import { LEVEL_MIN, type HandInput, type HandResult, type LevelState, type Seat, type Team } from './types'
import { resolveHand } from './resolve'
import { roundScore, type RoundScore } from './scoring'
import { kangTeam } from './tribute'

export interface RoundComputed {
  hands: HandResult[]
  /** Final level/attempt state after the last hand. */
  finalState: LevelState
  /** Set once a hand ends the round (someone 过A). */
  score: RoundScore | null
  /** True if the round reached a 过A win; false = still in progress / incomplete. */
  complete: boolean
}

export function initialLevelState(firstDealer: Team): LevelState {
  return {
    blueLevel: LEVEL_MIN,
    redLevel: LEVEL_MIN,
    blueAAttempt: 0,
    redAAttempt: 0,
    leading: firstDealer,
  }
}

/**
 * Fold a round's hand inputs through the engine. Stops applying once a hand ends the round;
 * any extra inputs after a 过A are ignored (shouldn't happen in normal use).
 */
export function computeRound(
  seatTeams: Record<Seat, Team>,
  firstDealer: Team,
  inputs: HandInput[],
): RoundComputed {
  let state = initialLevelState(firstDealer)
  const hands: HandResult[] = []
  let score: RoundScore | null = null
  let complete = false

  for (const input of inputs) {
    const result = resolveHand(state, seatTeams, input)
    // Tribute owed INTO this hand comes from the previous hand's ranks (none for the first hand
    // of a round). 抗贡 is credited to that incoming tribute's source team (spec §9).
    const prev = hands[hands.length - 1]
    result.incomingTribute = prev ? prev.tributeForNext : { kind: 'none' }
    result.kangTeam = input.kangGong ? kangTeam(result.incomingTribute, seatTeams) : null
    hands.push(result)
    state = result.stateAfter
    if (result.roundOver) {
      score = roundScore(
        result.winner,
        result.winner === 'blue' ? state.blueLevel : state.redLevel,
        result.winner === 'blue' ? state.redLevel : state.blueLevel,
      )
      complete = true
      break
    }
  }

  return { hands, finalState: state, score, complete }
}
