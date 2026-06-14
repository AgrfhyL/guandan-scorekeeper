import { useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { playerName } from '@/store/selectors'
import { SEAT_TEAMS, type RoundState } from '@/store/types'
import type { Seat } from '@/rules-engine'

/** Seat setup + rename for the current (active) round (spec §8 玩家改名, §11 新开一轮). */
export function PlayersPage() {
  const match = useMatchStore((s) => s.match)!
  const assignSeatPlayer = useMatchStore((s) => s.assignSeatPlayer)
  const round = match.rounds[match.rounds.length - 1]
  const [editing, setEditing] = useState<Seat | null>(null)
  const [draft, setDraft] = useState('')

  const startEdit = (seat: Seat) => {
    setEditing(seat)
    setDraft(playerName(match, round.seats[seat]))
  }
  const commit = () => {
    if (editing !== null && draft.trim()) assignSeatPlayer(editing, draft)
    setEditing(null)
  }

  return (
    <div className="px-4 pt-4">
      <h2 className="mb-3 font-semibold">本轮座次</h2>
      <div className="grid grid-cols-2 gap-3">
        {([0, 1, 2, 3] as Seat[]).map((seat) => {
          const id = round.seats[seat]
          const team = SEAT_TEAMS[seat]
          return (
            <div
              key={seat}
              className={`flex items-center justify-between rounded-xl border px-3 py-3 ${
                team === 'blue' ? 'bg-blue-teamSoft' : 'bg-red-teamSoft'
              }`}
            >
              {editing === seat ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e) => e.key === 'Enter' && commit()}
                  className="w-full rounded border px-2 py-1"
                />
              ) : (
                <>
                  <span className={team === 'blue' ? 'text-blue-teamBright' : 'text-red-teamBright'}>
                    {playerName(match, id)}
                  </span>
                  <button onClick={() => startEdit(seat)} aria-label="改名" className="text-gray-400">
                    ✎
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-xs text-gray-400">
        改名只替换该座位的玩家：改为新名字会新增一名玩家，原玩家及其历史数据仍保留在榜单中；改为已存在的名字则复用该玩家。
      </p>
      <RoundList rounds={match.rounds} />
    </div>
  )
}

function RoundList({ rounds }: { rounds: RoundState[] }) {
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-medium text-gray-500">所有轮次</h3>
      <ul className="space-y-1 text-sm">
        {rounds.map((r, i) => (
          <li key={r.id} className="flex justify-between rounded-lg bg-white px-3 py-2">
            <span>第 {i + 1} 轮</span>
            <span className="text-gray-400">{r.hands.length} 把</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
