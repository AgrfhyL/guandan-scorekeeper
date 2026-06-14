import { useMemo } from 'react'
import { computeRoundState, playerName } from '@/store/selectors'
import type { MatchState, RoundState } from '@/store/types'
import { levelLabel, type ResultCode, type Seat } from '@/rules-engine'
import { TributeView } from './TributeView'

const RESULT_CLASS: Record<ResultCode, string> = {
  赢: 'text-felt font-semibold',
  胜: 'font-bold',
  输: 'text-gray-400',
  未过: 'font-semibold',
  退回2: 'font-semibold',
}

/** Per-round 9-column record table (spec §10). */
export function RoundTable({
  match,
  round,
  roundNo,
}: {
  match: MatchState
  round: RoundState
  roundNo: number
}) {
  const computed = useMemo(() => computeRoundState(round), [round])
  const seats = [0, 1, 2, 3] as Seat[]

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2 text-sm">
        <span className="font-medium">第 {roundNo} 轮</span>
        <span className={round.firstDealer === 'blue' ? 'text-blue-teamBright' : 'text-red-teamBright'}>
          {round.firstDealer === 'blue' ? '蓝先' : '红先'}
        </span>
        <span className="text-gray-400">
          {computed.complete ? '已完成' : round.status === 'incomplete' ? '未完成' : '进行中'}
        </span>
      </div>

      <table className="w-full table-fixed text-center text-xs">
        <thead className="text-gray-400">
          <tr>
            <th className="w-8 py-1">#</th>
            <th className="w-16">级别</th>
            <th>进贡</th>
            <th className="w-6">抗</th>
            {seats.map((s) => (
              <th key={s} className="w-10 truncate">
                {playerName(match, round.seats[s]).slice(0, 3)}
              </th>
            ))}
            <th className="w-10">结果</th>
          </tr>
        </thead>
        <tbody>
          {computed.hands.map((h, i) => (
            <tr key={i} className="border-t">
              <td className="py-1">#{i + 1}</td>
              <td>
                <span className="text-blue-team">蓝{levelLabel(h.stateBefore.blueLevel)}</span>
                <span className="text-gray-400"> : </span>
                <span className="text-red-team">红{levelLabel(h.stateBefore.redLevel)}</span>
              </td>
              <td>
                <TributeView descriptor={h.incomingTribute} match={match} round={round} />
              </td>
              <td>{h.kangTeam ? '抗' : ''}</td>
              {seats.map((s) => (
                <td key={s}>{h.input.ranks[s]}</td>
              ))}
              <td className={RESULT_CLASS[h.result]}>{h.result}</td>
            </tr>
          ))}
          {computed.hands.length === 0 && (
            <tr>
              <td colSpan={9} className="py-3 text-gray-300">
                暂无记录
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
