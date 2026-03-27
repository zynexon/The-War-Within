import { useEffect, useMemo, useState } from 'react'
import ConfirmationModal from './components/ConfirmationModal'
import Navbar from './components/Navbar'
import TaskCard from './components/TaskCard'
import XPBar from './components/XPBar'

const ACCESS_TOKEN_KEY = 'zynexon_access_token'
const REFRESH_TOKEN_KEY = 'zynexon_refresh_token'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function apiUrl(path) {
  if (!API_BASE_URL) {
    return path
  }
  return `${API_BASE_URL}${path}`
}

async function readApiPayload(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  try {
    const text = await response.text()
    return text ? { detail: text } : null
  } catch {
    return null
  }
}

function App() {
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [streakDays, setStreakDays] = useState(0)
  const [userEmail, setUserEmail] = useState('')
  const [accessToken, setAccessToken] = useState(localStorage.getItem(ACCESS_TOKEN_KEY) || '')
  const [authMode, setAuthMode] = useState('login')
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [justCompletedId, setJustCompletedId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [activeTab, setActiveTab] = useState('Home')
  const [leaderboardEntries, setLeaderboardEntries] = useState([])
  const [currentUserRank, setCurrentUserRank] = useState(null)

  const levelStartXp = useMemo(() => {
    if (level <= 1) {
      return 0
    }
    return level * level * 50
  }, [level])
  const levelEndXp = useMemo(() => {
    if (level <= 1) {
      return 200
    }
    return (level + 1) * (level + 1) * 50
  }, [level])
  const currentLevelXp = useMemo(() => Math.max(0, xp - levelStartXp), [xp, levelStartXp])
  const xpTarget = useMemo(() => Math.max(1, levelEndXp - levelStartXp), [levelEndXp, levelStartXp])
  const completedCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks])
  const dailyStatusMessage = useMemo(() => {
    if (completedCount === 0) {
      return 'Win the first battle of the day.'
    }

    if (tasks.length > 0 && completedCount === tasks.length) {
      return 'Day won.'
    }

    return "You showed up. That's power."
  }, [completedCount, tasks.length])

  function rankMeta(rank) {
    if (rank === 1) {
      return {
        icon: '🥇',
        className: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300 text-sm',
      }
    }
    if (rank === 2) {
      return {
        icon: '🥈',
        className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300',
      }
    }
    if (rank === 3) {
      return {
        icon: '🥉',
        className: 'bg-orange-100 text-orange-700 ring-1 ring-orange-300',
      }
    }

    return {
      icon: null,
      className: 'bg-zinc-100 text-zinc-700',
    }
  }

  function persistTokens(access, refresh) {
    if (access) {
      localStorage.setItem(ACCESS_TOKEN_KEY, access)
      setAccessToken(access)
    }
    if (refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
    }
  }

  async function refreshAccessToken() {
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refresh) {
      throw new Error('No refresh token available.')
    }

    const response = await fetch(apiUrl('/api/auth/refresh/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })

    const data = await readApiPayload(response)
    if (!response.ok || !data.access) {
      throw new Error(data?.detail || 'Session refresh failed.')
    }

    persistTokens(data.access, data.refresh)
    return data.access
  }

  async function authedFetch(path, options = {}, retryOnAuth = true) {
    const execute = async (token) => {
      return fetch(apiUrl(path), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      })
    }

    const currentToken = localStorage.getItem(ACCESS_TOKEN_KEY) || accessToken
    let response = await execute(currentToken)

    if (response.status === 401 && retryOnAuth) {
      try {
        const newAccess = await refreshAccessToken()
        response = await execute(newAccess)
      } catch {
        handleLogout()
        throw new Error('Session expired. Please sign in again.')
      }
    }

    const data = await readApiPayload(response)

    if (!response.ok) {
      throw new Error(data?.detail || data?.error || 'Request failed.')
    }

    return data
  }

  useEffect(() => {
    async function loadDashboard() {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setErrorText('')

      try {
        const user = await authedFetch('/api/auth/me/')
        setUserEmail(user.email)
        setLevel(user.level)
        setXp(user.xp)
        setStreakDays(user.streak)

        const dailyTasks = await authedFetch('/api/daily-tasks/')
        setTasks(
          dailyTasks.map((task) => ({
            id: task.id,
            name: task.task_title,
            xp: task.task_xp,
            completed: task.completed,
          })),
        )

        const leaderboard = await authedFetch('/api/leaderboard/?limit=25')
        setLeaderboardEntries(leaderboard.entries || [])
        setCurrentUserRank(leaderboard.current_user_rank || null)
      } catch (error) {
        setErrorText(error.message || 'Could not connect to backend.')
        handleLogout()
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [accessToken])

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthLoading(true)
    setErrorText('')

    try {
      if (authMode === 'register') {
        const registerResponse = await fetch(apiUrl('/api/auth/register/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput, password: passwordInput }),
        })
        const registerData = await readApiPayload(registerResponse)
        if (!registerResponse.ok) {
          throw new Error(registerData.error || 'Registration failed.')
        }
      }

      const loginResponse = await fetch(apiUrl('/api/auth/login/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: emailInput, password: passwordInput }),
      })
      const loginData = await readApiPayload(loginResponse)
      if (!loginResponse.ok) {
        throw new Error(loginData.detail || 'Login failed.')
      }

      persistTokens(loginData.access, loginData.refresh)
      setPasswordInput('')
    } catch (error) {
      setErrorText(error.message || 'Authentication failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setAccessToken('')
    setTasks([])
    setUserEmail('')
    setLevel(1)
    setXp(0)
    setStreakDays(0)
    setLeaderboardEntries([])
    setCurrentUserRank(null)
  }

  function handleAskComplete(task) {
    if (task.completed) {
      return
    }
    setSelectedTask(task)
  }

  async function handleConfirmYes() {
    if (!selectedTask) {
      return
    }

    const taskId = selectedTask.id

    try {
      const data = await authedFetch('/api/complete-task/', {
        method: 'POST',
        body: JSON.stringify({ userTaskId: taskId }),
      })

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId ? { ...task, completed: true } : task,
        ),
      )
      setXp(data.total_xp)
      setLevel(data.level)
      setStreakDays(data.streak)

      setJustCompletedId(taskId)
      setTimeout(() => setJustCompletedId(null), 1200)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message || 'Task could not be completed.')
    } finally {
      setSelectedTask(null)
    }
  }

  function handleConfirmNo() {
    setSelectedTask(null)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[400px] flex-col px-5 pt-8 pb-6 space-y-9 relative">
      <header className="rounded-3xl border border-zinc-200/60 bg-white px-5 py-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black tracking-tight text-zinc-900">ZYNEXON</h1>
          <p className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-black tracking-widest text-white shadow-md">
            LV.{level}
          </p>
        </div>
        <XPBar currentXp={currentLevelXp} targetXp={xpTarget} />
      </header>

      {!accessToken ? (
        <section className="rounded-3xl border border-zinc-200 bg-white px-4 py-5 shadow-sm">
          <div className="mb-4 flex gap-2 text-xs font-bold uppercase tracking-wider">
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 transition ${authMode === 'login' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 transition ${authMode === 'register' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </div>

          <form className="space-y-3" onSubmit={handleAuthSubmit}>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
            <input
              type="password"
              required
              minLength={8}
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {authLoading ? 'Please wait...' : authMode === 'register' ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </section>
      ) : (
        <section className="rounded-3xl border border-zinc-200 bg-white px-4 py-3 shadow-sm flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-500">Signed in as {userEmail}</p>
          <button type="button" className="text-xs font-bold text-zinc-900" onClick={handleLogout}>
            Logout
          </button>
        </section>
      )}

      {activeTab === 'Leaderboard' ? (
        <section className="space-y-4">
          <div className="text-center pt-2">
            <h2 className="text-4xl font-black leading-tight tracking-tighter text-zinc-950">Leaderboard</h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-400">You vs your weaker self.</p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              {currentUserRank?.rank === 1 ? 'Climb or stay average.' : 'Someone is ahead of you.'}
            </p>
          </div>

          {currentUserRank ? (
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900 p-4 text-white shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300">Your Position</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-black">#{currentUserRank.rank}</p>
                <p className="text-sm font-semibold">{currentUserRank.xp} XP • {currentUserRank.streak} streak</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2.5">
            {leaderboardEntries.map((entry) => {
              const badge = rankMeta(entry.rank)

              return (
                <div
                  key={entry.user_id}
                  className={`rounded-2xl border px-3 py-3 transition ${entry.is_current_user ? 'border-zinc-900 bg-zinc-100' : 'border-zinc-200 bg-white'}`}
                >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex min-w-[68px] items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${badge.className}`}>
                      <span>#{entry.rank}</span>
                      {badge.icon ? <span>{badge.icon}</span> : null}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">
                        {entry.email}
                        {entry.is_current_user ? ' (You)' : ''}
                      </p>
                      <p className="text-[11px] font-semibold text-zinc-500">LV.{entry.level} • 🔥 {entry.streak}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-zinc-900">{entry.xp} XP</p>
                </div>
                </div>
              )
            })}
            {!isLoading && leaderboardEntries.length === 0 ? (
              <p className="text-sm text-zinc-500">No leaderboard data yet.</p>
            ) : null}
          </div>
        </section>
      ) : (
        <>
          <section className="text-center pt-2">
            <h2 className="text-5xl font-black leading-[1.05] tracking-tighter text-zinc-950">
              Did you win<br />today?
            </h2>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-zinc-400">
              Every action builds your identity.
            </p>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-800">Daily Tasks</h2>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-black tracking-widest text-zinc-600">
                {completedCount}/{tasks.length}
              </span>
            </div>

            <div className="space-y-3.5 relative">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleAskComplete}
                  isJustCompleted={task.id === justCompletedId}
                />
              ))}
              {isLoading ? <p className="text-sm text-zinc-500">Loading daily tasks...</p> : null}
            </div>
          </section>

          <section className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-white py-8 px-4 text-center shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <span className="text-4xl drop-shadow-sm">🔥</span>
            <h3 className="mt-3 text-xl font-black tracking-tight text-zinc-900">{streakDays} Day Streak</h3>
            <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">Don't break the chain.</p>
          </section>

          <div className="text-center pt-2 min-h-12">
            <p className={`text-[13px] font-bold uppercase tracking-wide transition-all duration-500 ${
              completedCount > 0 ? 'text-zinc-900' : 'text-zinc-400'
            }`}>
              {dailyStatusMessage}
            </p>
            {errorText ? <p className="mt-2 text-xs font-semibold text-red-600">{errorText}</p> : null}
          </div>
        </>
      )}

      <div className="mt-auto pt-6">
        <Navbar activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <ConfirmationModal
        open={Boolean(selectedTask)}
        taskName={selectedTask?.name || ''}
        onYes={handleConfirmYes}
        onNo={handleConfirmNo}
        onClose={() => setSelectedTask(null)}
      />
    </main>
  )
}

export default App
