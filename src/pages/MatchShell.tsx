import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMatchStore } from '@/store/matchStore'
import { useMatchSync } from '@/sync/useMatchSync'
import { TablePage } from './TablePage'
import { PlayersPage } from './PlayersPage'
import { LeaderboardPage } from './LeaderboardPage'
import { RulesPage } from './RulesPage'
import type { SaveStatus } from '@/sync/useMatchSync'

type Tab = 'table' | 'players' | 'board' | 'rules'

const TABS: { key: Tab; label: string }[] = [
  { key: 'table', label: '牌桌' },
  { key: 'players', label: '玩家' },
  { key: 'board', label: '榜单' },
  { key: 'rules', label: '规则' },
]

function SaveDot({ status }: { status: SaveStatus }) {
  if (status === 'saved') return <span className="h-2 w-2 rounded-full bg-green-400" title="已同步" />
  if (status === 'saving') return <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" title="同步中" />
  if (status === 'error') return (
    <span className="rounded px-1.5 py-0.5 text-xs text-red-600 bg-red-50">
      本地记录正常，云端保存失败，尝试补存中
    </span>
  )
  return null
}

export function MatchShell() {
  const match = useMatchStore((s) => s.match)
  const [tab, setTab] = useState<Tab>('table')
  // Password is stored in the match for autosave; spectators have no password.
  const { saveStatus } = useMatchSync(match?.password ?? null)

  if (!match) return <Navigate to="/" replace />

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      {/* Top bar: match code + save indicator */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-2 text-xs text-gray-400 safe-top">
        <span>比赛码 <strong className="text-gray-700">{match.code}</strong></span>
        <div className="flex items-center gap-2">
          <span className="text-felt">记录模式</span>
          <SaveDot status={saveStatus} />
        </div>
      </div>

      <main className="flex-1 pb-20">
        {tab === 'table' && <TablePage />}
        {tab === 'players' && <PlayersPage />}
        {tab === 'board' && <LeaderboardPage />}
        {tab === 'rules' && <RulesPage />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md justify-around border-t bg-white safe-bottom">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm ${tab === t.key ? 'font-semibold text-felt' : 'text-gray-400'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
