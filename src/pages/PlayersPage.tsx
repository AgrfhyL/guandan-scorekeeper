import { useRef, useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { playerName } from '@/store/selectors'
import { SEAT_TEAMS, type RoundState } from '@/store/types'
import type { Seat } from '@/rules-engine'
import { useReadOnly } from '@/components/ReadOnly'

/** Inline autocomplete for seat assignment — filters existing players as you type. */
function SeatEditor({
  allNames,
  onCommit,
  onCancel,
}: {
  allNames: string[]
  onCommit: (name: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = draft.trim()
    ? allNames.filter((n) => n.toLowerCase().includes(draft.trim().toLowerCase()))
    : allNames

  const commit = (name: string) => {
    const trimmed = name.trim()
    if (trimmed) onCommit(trimmed)
    else onCancel()
  }

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(draft)
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={() => {
          // Delay so a suggestion tap registers before blur fires.
          setTimeout(() => {
            if (!inputRef.current?.closest('[data-seat-editor]')?.contains(document.activeElement)) {
              commit(draft)
            }
          }, 150)
        }}
        className="w-full rounded border px-2 py-1 text-sm"
        placeholder="输入或选择玩家"
      />
      {open && suggestions.length > 0 && (
        <ul
          data-seat-editor
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-white shadow-lg"
        >
          {suggestions.map((name) => (
            <li key={name}>
              <button
                onMouseDown={(e) => e.preventDefault()} // keep focus on input
                onClick={() => { setOpen(false); commit(name) }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PlayersPage() {
  const match = useMatchStore((s) => s.match)!
  const assignSeatPlayer = useMatchStore((s) => s.assignSeatPlayer)
  const round = match.rounds[match.rounds.length - 1]
  const [editing, setEditing] = useState<Seat | null>(null)
  const readOnly = useReadOnly()

  const seatedIds = new Set(round.seats)
  const allNames = match.players
    .filter((p) => !seatedIds.has(p.id))
    .map((p) => p.name)

  const commit = (seat: Seat, name: string) => {
    assignSeatPlayer(seat, name)
    setEditing(null)
  }

  return (
    <div className="px-4 pt-4">
      <h2 className="mb-3 font-semibold">本轮座次</h2>
      <div className="grid grid-cols-2 gap-3">
        {([0, 1, 2, 3] as Seat[]).map((seat) => {
          const id = round.seats[seat]
          const team = SEAT_TEAMS[seat]
          const isEditing = editing === seat
          return (
            <div
              key={seat}
              data-seat-editor
              className={`flex items-center justify-between rounded-xl border px-3 py-3 ${
                team === 'blue' ? 'bg-blue-teamSoft' : 'bg-red-teamSoft'
              }`}
            >
              {isEditing && !readOnly ? (
                <SeatEditor
                  allNames={allNames}
                  onCommit={(name) => commit(seat, name)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <>
                  <span className={team === 'blue' ? 'text-blue-teamBright' : 'text-red-teamBright'}>
                    {playerName(match, id)}
                  </span>
                  {!readOnly && (
                    <button onClick={() => setEditing(seat)} aria-label="改名" className="text-gray-400">
                      ✎
                    </button>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
      {!readOnly && (
        <p className="mt-4 text-xs text-gray-400">
          新玩家加入：点击要替换的玩家后输入名字
          老玩家加入：点击要替换的玩家后直接选择
        </p>
      )}
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
