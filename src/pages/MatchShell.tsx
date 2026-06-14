import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMatchStore } from '@/store/matchStore'
import { TablePage } from './TablePage'
import { PlayersPage } from './PlayersPage'
import { LeaderboardPage } from './LeaderboardPage'
import { RulesPage } from './RulesPage'

type Tab = 'table' | 'players' | 'board' | 'rules'

const TABS: { key: Tab; label: string }[] = [
  { key: 'table', label: '牌桌' },
  { key: 'players', label: '玩家' },
  { key: 'board', label: '榜单' },
  { key: 'rules', label: '规则' },
]

export function MatchShell() {
  const match = useMatchStore((s) => s.match)
  const [tab, setTab] = useState<Tab>('table')

  if (!match) return <Navigate to="/" replace />

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
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
