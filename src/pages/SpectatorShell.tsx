import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSpectator } from '@/sync/useSpectator'
import { ReadOnlyProvider } from '@/components/ReadOnly'
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

export function SpectatorShell() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('table')
  const { match, status, refreshing } = useSpectator(code.toUpperCase())

  if (status === 'loading') {
    return <CenterMsg text="正在载入比赛…" />
  }
  if (status === 'unconfigured') {
    return <CenterMsg text="云端未配置，无法观赛。" onBack={() => navigate('/')} />
  }
  if (status === 'notfound' || !match) {
    return <CenterMsg text={`未找到比赛码 ${code.toUpperCase()}`} onBack={() => navigate('/')} />
  }

  return (
    <ReadOnlyProvider value={true}>
      <div className="mx-auto flex min-h-full max-w-md flex-col">
        {/* Top bar: match code + spectator badge */}
        <div className="flex items-center justify-between border-b bg-white px-4 py-2 text-xs text-gray-400 safe-top">
          <span>比赛码 <strong className="text-gray-700">{match.code}</strong></span>
          <div className="flex items-center gap-2">
            {refreshing && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" title="更新中" />}
            <span className="text-amber-500">观赛模式</span>
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
    </ReadOnlyProvider>
  )
}

function CenterMsg({ text, onBack }: { text: string; onBack?: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center safe-top">
      <p className="text-gray-500">{text}</p>
      {onBack && (
        <button onClick={onBack} className="rounded-lg bg-felt px-4 py-2 text-sm font-medium text-white">
          返回首页
        </button>
      )}
    </div>
  )
}
