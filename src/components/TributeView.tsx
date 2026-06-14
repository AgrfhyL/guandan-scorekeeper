import type { MatchState } from '@/store/types'
import { playerName } from '@/store/selectors'
import type { RoundState } from '@/store/types'
import type { TributeDescriptor } from '@/rules-engine'

function TeamDot({ team }: { team: 'blue' | 'red' }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${team === 'blue' ? 'bg-blue-team' : 'bg-red-team'}`}
    />
  )
}

/**
 * Single source of truth for 进贡 display (spec §10): used by the table, round record,
 * leaderboard detail, and the export image. 单贡 → name → name; 双贡 → team dot → team dot.
 */
export function TributeView({
  descriptor,
  match,
  round,
}: {
  descriptor: TributeDescriptor
  match: MatchState
  round: RoundState
}) {
  if (descriptor.kind === 'none') return <span className="text-gray-300">—</span>
  if (descriptor.kind === 'double') {
    return (
      <span className="inline-flex items-center gap-1">
        <TeamDot team={descriptor.fromTeam} /> → <TeamDot team={descriptor.toTeam} />
      </span>
    )
  }
  return (
    <span className="text-xs">
      {playerName(match, round.seats[descriptor.fromSeat])} → {playerName(match, round.seats[descriptor.toSeat])}
    </span>
  )
}
