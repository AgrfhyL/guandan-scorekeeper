import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMatchStore } from '@/store/matchStore'

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export function Home() {
  const navigate = useNavigate()
  const createMatch = useMatchStore((s) => s.createMatch)
  const existing = useMatchStore((s) => s.match)

  const [code, setCode] = useState(randomCode)
  const [password, setPassword] = useState('')
  const [date, setDate] = useState(todayISO)
  const [location, setLocation] = useState('')
  const [names, setNames] = useState<[string, string, string, string]>(['', '', '', ''])
  const [showHelp, setShowHelp] = useState(false)
  const [spectateCode, setSpectateCode] = useState('')

  const canCreate = code.trim().length === 4 && password.trim().length === 4

  const handleCreate = () => {
    // Empty names default to 玩家1–4 (client request).
    const playerNames = names.map((n, i) => n.trim() || `玩家${i + 1}`) as [string, string, string, string]
    createMatch({ code: code.trim().toUpperCase(), password: password.trim(), date, location, playerNames })
    navigate('/m/table')
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 safe-top">
      <h1 className="mb-1 text-2xl font-bold">掼蛋记分</h1>
      <p className="mb-6 text-sm text-gray-500">单日活动 · 多人轮换记分</p>

      {existing && (
        <button
          onClick={() => navigate('/m/table')}
          className="mb-4 w-full rounded-xl bg-felt px-4 py-3 text-left font-medium text-white"
        >
          继续活动 · {existing.code}
          <span className="ml-2 text-sm opacity-80">{existing.rounds.length} 轮</span>
        </button>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">新建活动</h2>

        <label className="mb-2 block text-sm text-gray-600">比赛码（4 位）</label>
        <div className="mb-3 flex gap-2">
          <input
            value={code}
            maxLength={4}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="flex-1 rounded-lg border px-3 py-2 uppercase tracking-widest"
          />
          <button onClick={() => setCode(randomCode())} className="rounded-lg border px-3 text-sm">
            随机
          </button>
        </div>

        <label className="mb-2 block text-sm text-gray-600">密码（4 位，必填）</label>
        <input
          type="password"
          inputMode="text"
          autoComplete="new-password"
          value={password}
          maxLength={4}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3 w-full rounded-lg border px-3 py-2 tracking-widest"
        />

        <div className="mb-3 flex flex-col gap-3 min-[380px]:flex-row min-[380px]:gap-2">
          <div className="min-w-0 min-[380px]:flex-1">
            <label className="mb-2 block text-sm text-gray-600">日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-w-0 rounded-lg border px-3 py-2"
            />
          </div>
          <div className="min-w-0 min-[380px]:flex-1">
            <label className="mb-2 block text-sm text-gray-600">地点（可空）</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full min-w-0 rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        <label className="mb-2 block text-sm text-gray-600">当前桌 4 位玩家（可空，默认玩家1–4）</label>
        <div className="mb-1 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-blue-teamSoft py-1 text-center text-xs font-semibold text-blue-teamBright">
            蓝队
          </div>
          <div className="rounded-md bg-red-teamSoft py-1 text-center text-xs font-semibold text-red-teamBright">
            红队
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {names.map((n, i) => (
            <input
              key={i}
              value={n}
              placeholder={`玩家 ${i + 1}`}
              onChange={(e) => {
                const next = [...names] as typeof names
                next[i] = e.target.value
                setNames(next)
              }}
              className={`rounded-lg border px-3 py-2 ${
                i % 2 === 0
                  ? 'text-blue-teamBright placeholder:text-blue-team/50'
                  : 'text-red-teamBright placeholder:text-red-team/50'
              }`}
            />
          ))}
        </div>

        <button
          disabled={!canCreate}
          onClick={handleCreate}
          className="w-full rounded-xl bg-felt px-4 py-3 font-semibold text-white disabled:opacity-40"
        >
          开始记分
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">观赛</h2>
        <label className="mb-2 block text-sm text-gray-600">输入比赛码即可实时观看</label>
        <div className="flex gap-2">
          <input
            value={spectateCode}
            maxLength={4}
            placeholder="比赛码"
            onChange={(e) => setSpectateCode(e.target.value.toUpperCase())}
            className="flex-1 rounded-lg border px-3 py-2 uppercase tracking-widest"
          />
          <button
            disabled={spectateCode.trim().length !== 4}
            onClick={() => navigate(`/s/${spectateCode.trim().toUpperCase()}`)}
            className="rounded-lg bg-felt px-4 text-sm font-medium text-white disabled:opacity-40"
          >
            观赛
          </button>
        </div>
      </div>

      <button onClick={() => setShowHelp((v) => !v)} className="mt-4 text-sm text-gray-500 underline">
        帮助
      </button>
      {showHelp && (
        <div className="mt-2 rounded-xl bg-white p-4 text-sm text-gray-600 shadow-sm">
          <p>1. 填写比赛码、密码与 4 位玩家，点击开始。</p>
          <p>2. 每一把按出完牌顺序点击玩家，自动记录名次。</p>
          <p>3. 榜单页查看个人积分与今日总览，可导出长图。</p>
        </div>
      )}
    </div>
  )
}
