import { useMemo, useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { computeRoundState, playerName } from '@/store/selectors'
import { SEAT_TEAMS } from '@/store/types'
import { levelLabel, type Rank, type Seat, type Team } from '@/rules-engine'
import { RoundTable } from '@/components/RoundTable'

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

  const round = match.rounds[match.rounds.length - 1]
  const roundNo = match.rounds.length
  const computed = useMemo(() => computeRoundState(round), [round])

  const [taps, setTaps] = useState<Seat[]>([])
  const [kang, setKang] = useState(false)

  const firstHand = round.hands.length === 0 && taps.length === 0
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
    if (computed.complete || taps.includes(seat)) return
    const next = [...taps, seat]
    setTaps(next)
    commitIfComplete(next, kang)
  }

  const setFirstDealer = (team: Team) => {
    // Re-create the round's first dealer by restarting an empty round in place.
    if (round.hands.length > 0) return
    // mutate via startRound replacement is heavy; instead update through store helper:
    useMatchStore.setState((s) => ({
      match: s.match && {
        ...s.match,
        rounds: s.match.rounds.map((r) => (r.id === round.id ? { ...r, firstDealer: team } : r)),
      },
    }))
  }

  const newRound = () => {
    setRoundStatus(round.id, computed.complete ? 'complete' : 'incomplete')
    startRound('blue', round.seats)
    setTaps([])
    setKang(false)
  }

  const tapRank = (seat: Seat): number | null => {
    const idx = taps.indexOf(seat)
    if (idx >= 0) return idx + 1
    // show previous hand's ranks when idle (spec §8)
    if (taps.length === 0 && round.hands.length > 0) {
      return round.hands[round.hands.length - 1].ranks[seat]
    }
    return null
  }

  const leading = state.leading
  const blueLvl = levelLabel(state.blueLevel)
  const redLvl = levelLabel(state.redLevel)

  return (
    <div className="px-3 pt-3">
      {/* Header: round/hand + level score */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          第 {roundNo} 轮 · 第 {handNo} 把
        </div>
        <div className="text-lg font-bold">
          <span className={leading === 'blue' ? 'text-blue-teamBright' : 'text-blue-team'}>蓝{blueLvl}</span>
          <span className="mx-1 text-gray-400"> : </span>
          <span className={leading === 'red' ? 'text-red-teamBright' : 'text-red-team'}>红{redLvl}</span>
        </div>
      </div>

      {/* Green table */}
      <div className="relative mx-auto mb-3 h-72 rounded-3xl bg-felt shadow-inner">
        {/* top-left 先发 */}
        <div className="absolute left-2 top-2 flex gap-1">
          {firstHand ? (
            (['blue', 'red'] as Team[]).map((t) => (
              <button
                key={t}
                onClick={() => setFirstDealer(t)}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  round.firstDealer === t
                    ? t === 'blue'
                      ? 'bg-white text-blue-teamBright'
                      : 'bg-white text-red-teamBright'
                    : 'bg-white/20 text-white'
                }`}
              >
                {t === 'blue' ? '蓝先' : '红先'}
              </button>
            ))
          ) : (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
              {round.firstDealer === 'blue' ? '蓝先' : '红先'}
            </span>
          )}
        </div>

        {/* top-right 抗贡 */}
        <button
          onClick={() => setKang((v) => !v)}
          className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs ${
            kang ? 'bg-amber-300 text-amber-900' : 'bg-white/20 text-white'
          }`}
        >
          抗
        </button>

        {/* center hint / undo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-xs text-white/70">
          {computed.complete ? '本轮已结束' : '按顺序点击玩家名\n以录入名次'.split('\n').map((l) => <div key={l}>{l}</div>)}
        </div>

        {/* bottom-right undo/reset */}
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

        {/* players */}
        {([0, 1, 2, 3] as Seat[]).map((seat) => {
          const team = SEAT_TEAMS[seat]
          const isLead = leading === team
          const rank = tapRank(seat)
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
              <span className={`font-medium ${team === 'blue' ? (isLead ? 'text-blue-teamBright' : 'text-blue-team') : isLead ? 'text-red-teamBright' : 'text-red-team'}`}>
                {playerName(match, round.seats[seat])}
              </span>
            </button>
          )
        })}
      </div>

      {/* actions */}
      <div className="mb-4 flex gap-2">
        {round.hands.length > 0 && !computed.complete && (
          <button onClick={() => removeLastHand(round.id)} className="rounded-lg border px-3 py-2 text-sm">
            删除上一把
          </button>
        )}
        <button onClick={newRound} className="ml-auto rounded-lg bg-felt px-3 py-2 text-sm font-medium text-white">
          {computed.complete ? '新开一轮' : '结束本轮并新开'}
        </button>
      </div>

      {/* current round record */}
      <RoundTable match={match} round={round} roundNo={roundNo} />
    </div>
  )
}
