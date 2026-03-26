import { useEffect, useMemo, useState } from 'react'
import ConfirmationModal from './components/ConfirmationModal'
import Navbar from './components/Navbar'
import TaskCard from './components/TaskCard'
import XPBar from './components/XPBar'

const ACCESS_TOKEN_KEY = 'zynexon_access_token'
const REFRESH_TOKEN_KEY = 'zynexon_refresh_token'

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

    const response = await fetch('/api/auth/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })

    const data = await response.json()
    if (!response.ok || !data.access) {
      throw new Error(data?.detail || 'Session refresh failed.')
    }

    persistTokens(data.access, data.refresh)
    return data.access
  }

  async function authedFetch(path, options = {}, retryOnAuth = true) {
    const execute = async (token) => {
      return fetch(path, {
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

    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

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
        const registerResponse = await fetch('/api/auth/register/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput, password: passwordInput }),
        })
        const registerData = await registerResponse.json()
        if (!registerResponse.ok) {
          throw new Error(registerData.error || 'Registration failed.')
        }
      }

      const loginResponse = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: emailInput, password: passwordInput }),
      })
      const loginData = await loginResponse.json()
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
          {completedCount > 0 ? "You showed up. That's power." : "Weakness is waiting."}
        </p>
        {errorText ? <p className="mt-2 text-xs font-semibold text-red-600">{errorText}</p> : null}
      </div>

      <div className="mt-auto pt-6">
        <Navbar />
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
