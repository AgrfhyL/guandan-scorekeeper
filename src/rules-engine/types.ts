// Pure types for the Guandan scorekeeper rules engine. No I/O, no React, no DB.

export type Team = 'blue' | 'red'

/** Seats are internal only (never rendered as 东/南/西/北). Opposite seats share a team. */
export type Seat = 0 | 1 | 2 | 3

/** Finishing position within a hand: 1=头游, 2=二游, 3=三游, 4=末游. */
export type Rank = 1 | 2 | 3 | 4

/** Numeric level: 2..13 = 2..K, 14 = A. */
export type Level = number
export const LEVEL_MIN = 2
export const LEVEL_A = 14

/** Result code rendered in the round table (spec §10). */
export type ResultCode = '赢' | '输' | '未过' | '退回2' | '胜'

/** The minimal source-of-truth input for a single hand. */
export interface HandInput {
  /** rank[seat] = finishing position of the player in that seat. A permutation of 1..4. */
  ranks: [Rank, Rank, Rank, Rank]
  /** 抗贡 flag for this hand (the engine cannot know cards; this is a manual toggle). */
  kangGong: boolean
}

/** Seat→team mapping for a round. Opposite seats (0&2, 1&3) form the two teams. */
export interface SeatTeams {
  /** team[seat] */
  0: Team
  1: Team
  2: Team
  3: Team
}

/** Level/attempt state of both teams going INTO a hand. */
export interface LevelState {
  blueLevel: Level
  redLevel: Level
  /** Pass-A attempt counter per team: 0 = not yet at A; 1..3 = current A attempt number. */
  blueAAttempt: 0 | 1 | 2 | 3
  redAAttempt: 0 | 1 | 2 | 3
  /** Current 主打方 (declaring team) going into the hand. */
  leading: Team
}

/** The shape of a hand outcome from the winner (头游 team)'s perspective. */
export type HandShape = '双上' | '单上' | '单下' | '双下'

/** A 进贡 (tribute) descriptor for display only (single arrow or team→team). */
export type TributeDescriptor =
  | { kind: 'none' }
  | { kind: 'single'; fromSeat: Seat; toSeat: Seat }
  | { kind: 'double'; fromTeam: Team; toTeam: Team }

/** Fully derived record for one hand. */
export interface HandResult {
  input: HandInput
  /** Levels/attempt state the hand was PLAYED at (before applying the result). */
  stateBefore: LevelState
  /** Levels/attempt state AFTER applying the result. */
  stateAfter: LevelState
  winner: Team
  shape: HandShape
  /** Tribute owed for the NEXT hand, derived from this hand's ranks. */
  tributeForNext: TributeDescriptor
  /** Tribute owed INTO this hand (from the previous hand). Set by the round runner. */
  incomingTribute: TributeDescriptor
  /** Team credited with the 抗贡 (if kangGong is set): the incoming tribute's source side. */
  kangTeam: Team | null
  /** Whether this hand ends the round (someone passed A). */
  roundOver: boolean
  /** Result code for the round table. */
  result: ResultCode
}
