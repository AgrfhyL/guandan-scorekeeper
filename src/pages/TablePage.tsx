import { useMemo, useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { computeRoundState, playerName } from '@/store/selectors'
import { SEAT_TEAMS } from '@/store/types'
import { levelLabel, type Rank, type Seat, type Team } from '@/rules-engine'
import { RoundTable } from '@/components/RoundTable'
import { useReadOnly } from '@/components/ReadOnly'

const SEAT_POS: Record<Seat, string> = {
  0: 'top-2 left-1/2 -translate-x-1/2',
  1: 'right-2 top-1/2 -translate-y-1/2',
  2: 'bottom-2 left-1/2 -translate-x-1/2',
  3: 'left-2 top-1/2 -translate-y-1/2',
}

export function TablePage() {
  const match = useMatchStore((s) => s.match)!
  const addHand = useMatchStore((s) => s.addHand)
  const startRound = useMatchStore((s) => s.startRound)
  const removeLastHand = useMatchStore((s) => s.removeLastHand)
  const setRoundStatus = useMatchStore((s) => s.setRoundStatus)
  const setDealer = useMatchStore((s) => s.setFirstDealer)
  const readOnly = useReadOnly()

  const round = match.rounds[match.rounds.length - 1]
  const roundNo = match.rounds.length
  const computed = useMemo(() => computeRoundState(round), [round])

  const [taps, setTaps] = useState<Seat[]>([])
  const [kang, setKang] = useState(false)

  const state = computed.finalState
  const handNo = round.hands.length + 1

  const commitIfComplete = (nextTaps: Seat[], kangGong: boolean) => {
    if (nextTaps.length === 4) {
      const ranks = [1, 1, 1, 1] as [Rank, Rank, Rank, Rank]
      nextTaps.forEach((seat, i) => (ranks[seat] = (i + 1) as Rank))
      addHand(round.id, { ranks, kangGong })
      setTaps([])
      setKang(false)
    }
  }

  const tap = (seat: Seat) => {
    if (readOnly || computed.complete || taps.includes(seat)) return
    const next = [...taps, seat]
    setTaps(next)
    commitIfComplete(next, kang)
  }

  const setFirstDealer = (team: Team) => {
    if (round.hands.length > 0) return
    setDealer(round.id, team)
  }

  const newRound = () => {
    setRoundStatus(round.id, computed.complete ? 'complete' : 'incomplete')
    startRound(null, round.seats)
    setTaps([])
    setKang(false)
  }

  // Only the in-progress taps light up; circles clear after a commit or 删除上一把 (§ AL #1).
  const tapRank = (seat: Seat): number | null => {
    const idx = taps.indexOf(seat)
    return idx >= 0 ? idx + 1 : null
  }

  const leading = state.leading
  const blueLvl = levelLabel(state.blueLevel)
  const redLvl = levelLabel(state.redLevel)
  const needsDealer = round.firstDealer === null

  return (
    <div className="px-3 pt-3">
      {/* Header: round/hand + level score */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          第 {roundNo} 轮 · 第 {handNo} 把
        </div>
        <div className="text-lg font-bold">
          <span className={leading === 'blue' ? 'text-blue-teamBright underline decoration-2 underline-offset-4' : 'text-blue-team'}>蓝{blueLvl}</span>
          <span className="mx-1 text-gray-400"> : </span>
          <span className={leading === 'red' ? 'text-red-teamBright underline decoration-2 underline-offset-4' : 'text-red-team'}>红{redLvl}</span>
        </div>
      </div>

      {/* Green table */}
      <div className="relative mx-auto mb-3 h-72 rounded-3xl bg-felt shadow-inner">
        {/* Pre-round dealer prompt (§7): pick 蓝先/红先 before player names appear. */}
        {needsDealer && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-3xl bg-felt">
            {readOnly ? (
              <span className="text-sm text-white/80">等待记录人选择先发方…</span>
            ) : (
              <>
                <span className="text-sm text-white/80">请选择本轮先发方</span>
                <div className="flex gap-4">
                  <button
                    onClick={() => setFirstDealer('blue')}
                    className="rounded-2xl bg-white px-6 py-4 text-lg font-bold text-blue-teamBright shadow"
                  >
                    蓝先
                  </button>
                  <button
                    onClick={() => setFirstDealer('red')}
                    className="rounded-2xl bg-white px-6 py-4 text-lg font-bold text-red-teamBright shadow"
                  >
                    红先
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {/* top-left 先发 (label only; selection happens in the pre-round overlay) */}
        {!needsDealer && (
          <div className="absolute left-2 top-2 flex gap-1">
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
              {round.firstDealer === 'blue' ? '蓝先' : '红先'}
            </span>
          </div>
        )}

        {/* top-right 抗贡 */}
        {!readOnly && (
          <button
            onClick={() => setKang((v) => !v)}
            className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs ${
              kang ? 'bg-amber-300 text-amber-900' : 'bg-white/20 text-white'
            }`}
          >
            抗
          </button>
        )}

        {/* center hint / undo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-xs text-white/70">
          {computed.complete
            ? '本轮已结束'
            : readOnly
              ? '观赛中 · 实时更新'
              : '按顺序点击玩家名\n以录入名次'.split('\n').map((l) => <div key={l}>{l}</div>)}
        </div>

        {/* bottom-right undo/reset */}
        {!readOnly && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            <button
              onClick={() => setTaps((t) => t.slice(0, -1))}
              className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white"
              aria-label="撤销上一步"
            >
              ↶
            </button>
            <button
              onClick={() => setTaps([])}
              className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white"
              aria-label="重置本把"
            >
              ⟲
            </button>
          </div>
        )}

        {/* players */}
        {!needsDealer &&
          ([0, 1, 2, 3] as Seat[]).map((seat) => {
            const team = SEAT_TEAMS[seat]
            const isLead = leading === team
            const rank = tapRank(seat)
            const nameColor = team === 'blue'
              ? isLead
                ? 'text-blue-teamBright underline decoration-2 underline-offset-4'
                : 'text-blue-team'
              : isLead
                ? 'text-red-teamBright underline decoration-2 underline-offset-4'
                : 'text-red-team'
            return (
              <button
                key={seat}
                onClick={() => tap(seat)}
                className={`absolute ${SEAT_POS[seat]} flex items-center gap-1 rounded-xl bg-white/90 px-3 py-2 shadow ${
                  taps.includes(seat) ? 'ring-2 ring-amber-400' : ''
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    rank ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {rank ?? ''}
                </span>
                <span className={`font-medium ${nameColor}`}>
                  {playerName(match, round.seats[seat])}
                </span>
              </button>
            )
          })}
      </div>

      {/* actions */}
      {!readOnly && (
        <div className="mb-4 flex gap-2">
          {round.hands.length > 0 && !computed.complete && (
            <button onClick={() => removeLastHand(round.id)} className="rounded-lg border px-3 py-2 text-sm">
              删除上一把
            </button>
          )}
          <button onClick={newRound} className="ml-auto rounded-lg bg-felt px-3 py-2 text-sm font-medium text-white">
            新开一轮
          </button>
        </div>
      )}

      {/* current round record */}
      <RoundTable match={match} round={round} roundNo={roundNo} />
    </div>
  )
}
