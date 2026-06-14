import { useMemo, useState } from 'react'
import { useMatchStore } from '@/store/matchStore'
import { matchOverview, matchPlayerStats, playerName } from '@/store/selectors'
import { RoundTable } from '@/components/RoundTable'
import type { PlayerStats } from '@/rules-engine'

type SortKey = keyof Pick<
  PlayerStats,
  'totalScore' | 'avgScore' | 'headCount' | 'winRate' | 'roundsPlayed' | 'roundsWon'
>

const TABS: { key: SortKey; label: string }[] = [
  { key: 'totalScore', label: '总分' },
  { key: 'avgScore', label: '均分' },
  { key: 'headCount', label: '头游' },
  { key: 'winRate', label: '胜率' },
  { key: 'roundsPlayed', label: '参与' },
  { key: 'roundsWon', label: '胜利' },
]

const fmt = (key: SortKey, s: PlayerStats) => {
  if (key === 'avgScore') return s.avgScore.toFixed(1)
  if (key === 'winRate') return `${Math.round(s.winRate * 100)}%`
  return String(s[key])
}

export function LeaderboardPage() {
  const match = useMatchStore((s) => s.match)!
  const endMatch = useMatchStore((s) => s.endMatch)
  const stats = useMemo(() => matchPlayerStats(match), [match])
  const overview = useMemo(() => matchOverview(match), [match])
  const [tab, setTab] = useState<SortKey>('totalScore')

  const sorted = useMemo(
    () => [...stats].sort((a, b) => (b[tab] as number) - (a[tab] as number) || b.totalScore - a.totalScore),
    [stats, tab],
  )

  return (
    <div className="px-4 pt-4">
      <h2 className="mb-3 font-semibold">今日总览</h2>
      <div className="mb-5 grid grid-cols-2 gap-2 text-sm">
        <Stat label="总轮数" value={overview.totalRounds} />
        <Stat label="总把数" value={overview.totalHands} />
        <Stat label="总抗贡" value={overview.totalKang} />
        <Stat label="A3失利" value={overview.a3FailCount} />
        <Stat label="最快轮" value={overview.fastestRound ?? '—'} />
        <Stat label="最慢轮" value={overview.slowestRound ?? '—'} />
      </div>

      <h2 className="mb-2 font-semibold">个人榜</h2>
      <div className="mb-2 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1 text-sm ${tab === t.key ? 'bg-felt text-white' : 'bg-white text-gray-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mb-6 overflow-hidden rounded-xl border bg-white">
        {sorted.map((s, i) => (
          <div key={s.playerId} className="flex items-center justify-between border-t px-3 py-2 text-sm first:border-t-0">
            <span className="w-6 text-gray-400">{i + 1}</span>
            <span className="flex-1">{playerName(match, s.playerId)}</span>
            <span className="font-medium">{fmt(tab, s)}</span>
          </div>
        ))}
        {sorted.length === 0 && <div className="py-4 text-center text-gray-300">暂无已完成轮次</div>}
      </div>

      <h2 className="mb-2 font-semibold">每轮记录</h2>
      <div className="space-y-3">
        {match.rounds.map((r, i) => (
          <RoundTable key={r.id} match={match} round={r} roundNo={i + 1} />
        ))}
      </div>

      {match.status === 'active' && (
        <button
          onClick={() => {
            if (confirm('确认结束本次活动？结束后将锁定为只读。')) endMatch()
          }}
          className="my-6 w-full rounded-xl border border-red-team px-4 py-3 font-medium text-red-teamBright"
        >
          结束活动
        </button>
      )}
      {match.status === 'ended' && (
        <p className="my-6 text-center text-sm text-gray-400">活动已结束（只读）</p>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
