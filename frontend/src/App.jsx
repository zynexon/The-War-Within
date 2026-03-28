import { useEffect, useMemo, useState } from 'react'
import ConfirmationModal from './components/ConfirmationModal'
import Navbar from './components/Navbar'
import TaskCard from './components/TaskCard'
import XPBar from './components/XPBar'

const ACCESS_TOKEN_KEY = 'zynexon_access_token'
const REFRESH_TOKEN_KEY = 'zynexon_refresh_token'
const BEST_GAME_SCORE_KEY = 'zynexon_best_quick_math_score'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const GAME_DAILY_MAX_XP = 50

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

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
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)))
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [streakDays, setStreakDays] = useState(0)
  const [userEmail, setUserEmail] = useState('')
  const [accessToken, setAccessToken] = useState(localStorage.getItem(ACCESS_TOKEN_KEY) || '')
  const [authMode, setAuthMode] = useState('login')
  const [nameInput, setNameInput] = useState('')
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
  const [userName, setUserName] = useState('')
  const [nameUpdating, setNameUpdating] = useState(false)
  const [gameSessionId, setGameSessionId] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [score, setScore] = useState(0)
  const [bestGameScore, setBestGameScore] = useState(() => {
    const stored = Number.parseInt(localStorage.getItem(BEST_GAME_SCORE_KEY) || '0', 10)
    return Number.isNaN(stored) ? 0 : stored
  })
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [gameSubmitting, setGameSubmitting] = useState(false)
  const [gameResult, setGameResult] = useState(null)
  const [animatedGameXp, setAnimatedGameXp] = useState(0)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPopup, setShowInstallPopup] = useState(false)
  const [installEligible, setInstallEligible] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

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
  const requiresNameSetup = Boolean(accessToken && user && !user.name)

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
        setLoadingUser(false)
        return
      }

      setIsLoading(true)
      setLoadingUser(true)
      setErrorText('')

      try {
        const user = await authedFetch('/api/auth/me/')
        setUser(user)
        setUserName(user.name || '')
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
        setLoadingUser(false)
      }
    }

    loadDashboard()
  }, [accessToken])

  useEffect(() => {
    if (!gameStarted) {
      return
    }

    const interval = setInterval(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [gameStarted])

  useEffect(() => {
    if (gameStarted && timeLeft === 0) {
      setGameStarted(false)
      setCurrentQuestion(null)
      void submitGameResult(score)
    }
  }, [gameStarted, timeLeft, score])

  useEffect(() => {
    const targetXp = gameResult?.xp_awarded || 0
    if (targetXp <= 0) {
      setAnimatedGameXp(0)
      return
    }

    setAnimatedGameXp(0)
    const durationMs = 500
    const stepMs = 30
    const steps = Math.max(1, Math.floor(durationMs / stepMs))
    const increment = targetXp / steps
    let current = 0

    const interval = setInterval(() => {
      current += increment
      if (current >= targetXp) {
        setAnimatedGameXp(targetXp)
        clearInterval(interval)
        return
      }
      setAnimatedGameXp(Math.floor(current))
    }, stepMs)

    return () => clearInterval(interval)
  }, [gameResult])

  useEffect(() => {
    setIsInstalled(isStandaloneMode())

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    const onAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setShowInstallPopup(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (installEligible && deferredPrompt && !isInstalled) {
      setShowInstallPopup(true)
    }
  }, [installEligible, deferredPrompt, isInstalled])

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthLoading(true)
    setErrorText('')

    try {
      if (authMode === 'register') {
        const registerResponse = await fetch(apiUrl('/api/auth/register/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nameInput, email: emailInput, password: passwordInput }),
        })
        const registerData = await readApiPayload(registerResponse)
        if (!registerResponse.ok) {
          throw new Error(registerData.name?.[0] || registerData.error || 'Registration failed.')
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
      if (authMode === 'register') {
        setNameInput('')
      }
    } catch (error) {
      setErrorText(error.message || 'Authentication failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleUpdateName(event) {
    event.preventDefault()
    if (!accessToken) {
      return
    }

    setNameUpdating(true)
    try {
      setErrorText('')
      const data = await authedFetch('/api/user/update-name/', {
        method: 'PATCH',
        body: JSON.stringify({ name: nameInput }),
      })
      setUser(data)
      setUserName(data.name || '')
      setNameInput('')
    } catch (error) {
      setErrorText(error.message || 'Could not update name.')
    } finally {
      setNameUpdating(false)
    }
  }

  async function handleInstallClick() {
    if (!deferredPrompt) {
      return
    }

    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      console.log('PWA install accepted')
    }

    setDeferredPrompt(null)
    setShowInstallPopup(false)
  }

  function handleLogout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setAccessToken('')
    setUser(null)
    setTasks([])
    setUserName('')
    setUserEmail('')
    setLevel(1)
    setXp(0)
    setStreakDays(0)
    setLeaderboardEntries([])
    setCurrentUserRank(null)
    setGameSessionId('')
    setGameStarted(false)
    setTimeLeft(30)
    setScore(0)
    setCurrentQuestion(null)
    setUserAnswer('')
    setGameSubmitting(false)
    setGameResult(null)
  }

  function generateQuestion() {
    const num1 = Math.floor(Math.random() * 20) + 1
    const num2 = Math.floor(Math.random() * 20) + 1
    const operators = ['+', '-', '*']
    const operator = operators[Math.floor(Math.random() * operators.length)]

    let answer = 0
    if (operator === '+') {
      answer = num1 + num2
    } else if (operator === '-') {
      answer = num1 - num2
    } else {
      answer = num1 * num2
    }

    return { num1, num2, operator, answer }
  }

  async function handleStartGame() {
    if (gameStarted) {
      return
    }

    const question = generateQuestion()
    setGameStarted(true)
    setTimeLeft(30)
    setScore(0)
    setCurrentQuestion(question)
    setUserAnswer('')
    setGameResult(null)

    try {
      setErrorText('')
      const data = await authedFetch('/api/game/start/', { method: 'POST' })
      setGameSessionId(data.session_id)
    } catch (error) {
      setGameStarted(false)
      setCurrentQuestion(null)
      setTimeLeft(30)
      setErrorText(error.message || 'Could not start game session.')
    }
  }

  function handleSubmitAnswer(event) {
    event.preventDefault()

    if (!gameStarted || !currentQuestion) {
      return
    }

    const parsed = Number.parseInt(userAnswer, 10)
    if (!Number.isNaN(parsed) && parsed === currentQuestion.answer) {
      setScore((previous) => previous + 1)
    }

    setUserAnswer('')
    setCurrentQuestion(generateQuestion())
  }

  async function submitGameResult(finalScore) {
    if (!gameSessionId) {
      setErrorText('Game session was not created. Please start again.')
      return
    }

    setGameSubmitting(true)
    try {
      setErrorText('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: gameSessionId,
          score: finalScore,
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      const user = await authedFetch('/api/auth/me/')
      setUser(user)
      setStreakDays(user.streak)
      if (data.score > bestGameScore) {
        setBestGameScore(data.score)
        localStorage.setItem(BEST_GAME_SCORE_KEY, String(data.score))
      }
      setGameResult({
        score: data.score,
        xp_awarded: data.xp_awarded,
        daily_cap: data.daily_cap,
        remaining_today: data.remaining_today,
        capped_by_daily_limit: data.capped_by_daily_limit,
      })
      setInstallEligible(true)
      setGameSessionId('')
      setTimeLeft(30)
    } catch (error) {
      setErrorText(error.message || 'Could not submit game result.')
    } finally {
      setGameSubmitting(false)
    }
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
      setInstallEligible(true)
    } catch (error) {
      setErrorText(error.message || 'Task could not be completed.')
    } finally {
      setSelectedTask(null)
    }
  }

  function handleConfirmNo() {
    setSelectedTask(null)
  }

  if (accessToken && loadingUser) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[400px] flex-col items-center justify-center px-5 py-8">
        <p className="text-sm font-semibold text-zinc-500">Loading...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[400px] flex-col px-5 pt-8 pb-6 space-y-9 relative">
      <div className="text-center text-2xl font-black tracking-[0.12em] text-zinc-900 mb-1">
        ZYNEXON
      </div>

      <header className="rounded-3xl border border-zinc-200/60 bg-white px-5 py-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900">{userName || 'Challenger'}</h1>
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
            {authMode === 'register' ? (
              <input
                type="text"
                required
                maxLength={30}
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="Name"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              />
            ) : null}
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
          <p className="text-xs font-semibold text-zinc-500">Signed in as {userName || userEmail}</p>
          <button type="button" className="text-xs font-bold text-zinc-900" onClick={handleLogout}>
            Logout
          </button>
        </section>
      )}

      {requiresNameSetup ? (
        <section className="rounded-3xl border border-zinc-200 bg-white px-4 py-5 shadow-sm space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-tight text-zinc-900">Set Your Name</h2>
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Add your name to continue and appear on the leaderboard.
            </p>
          </div>
          <form className="space-y-3" onSubmit={handleUpdateName}>
            <input
              type="text"
              required
              maxLength={30}
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={nameUpdating}
              className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {nameUpdating ? 'Saving...' : 'Save Name'}
            </button>
          </form>
          {errorText ? <p className="text-xs font-semibold text-red-600">{errorText}</p> : null}
        </section>
      ) : null}

      {!requiresNameSetup && (
      activeTab === 'Leaderboard' ? (
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
                        {entry.name || 'Player'}
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
      ) : activeTab === 'Game' ? (
        <section className="space-y-5">
          <div className="text-center pt-2">
            <h2 className="text-4xl font-black leading-tight tracking-tighter text-zinc-950">Quick Math</h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-400">30 seconds. No excuses.</p>
          </div>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center">
            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Time Left</p>
            <p className="mt-2 text-5xl font-black tracking-tight text-zinc-950">{timeLeft}s</p>
            <p className="mt-2 text-sm font-black text-zinc-900">Score: {score}</p>
            <p className="mt-2 text-xs font-semibold text-zinc-500">
              {gameStarted ? 'Solve as many as you can.' : 'Start when you are ready.'}
            </p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Max game XP per day: {GAME_DAILY_MAX_XP}
            </p>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <button
              type="button"
              onClick={handleStartGame}
              disabled={gameStarted || gameSubmitting}
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              {gameStarted ? 'Game Running...' : 'Start 30s Game'}
            </button>

            {gameStarted && currentQuestion ? (
              <form className="space-y-3" onSubmit={handleSubmitAnswer}>
                <p className="text-center text-3xl font-black tracking-tight text-zinc-950">
                  {currentQuestion.num1} {currentQuestion.operator} {currentQuestion.num2}
                </p>
                <input
                  type="number"
                  value={userAnswer}
                  onChange={(event) => setUserAnswer(event.target.value)}
                  placeholder="Your answer"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
                >
                  Submit Answer
                </button>
              </form>
            ) : null}

            {gameResult ? (
              <div className="rounded-xl bg-zinc-100 px-4 py-3 text-left">
                <p className="text-sm font-bold text-zinc-900">Score: {gameResult.score}</p>
                <p className="text-sm font-bold text-zinc-900">XP Awarded: {animatedGameXp}</p>
                <p className="mt-1 text-xs font-semibold text-zinc-600">
                  {gameResult.score > bestGameScore ? 'New best score. Beat it again.' : `Beat your score: ${bestGameScore}`}
                </p>
                {gameResult.capped_by_daily_limit ? (
                  <p className="mt-1 text-xs font-semibold text-zinc-600">
                    Daily game XP cap reached. Remaining today: {gameResult.remaining_today}
                  </p>
                ) : null}
              </div>
            ) : null}

            {!gameStarted && gameResult ? (
              <button
                type="button"
                onClick={handleStartGame}
                disabled={gameSubmitting}
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-60"
              >
                Play Again
              </button>
            ) : null}

            {errorText ? <p className="text-xs font-semibold text-red-600">{errorText}</p> : null}
          </section>
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
      ))}

      {!requiresNameSetup ? (
        <div className="mt-auto pt-6">
          <Navbar activeTab={activeTab} onChange={setActiveTab} />
        </div>
      ) : null}

      <ConfirmationModal
        open={Boolean(selectedTask)}
        taskName={selectedTask?.name || ''}
        onYes={handleConfirmYes}
        onNo={handleConfirmNo}
        onClose={() => setSelectedTask(null)}
      />

      {showInstallPopup ? (
        <div className="fixed bottom-6 left-1/2 z-50 w-[88%] max-w-[360px] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl">
          <h3 className="text-lg font-semibold text-zinc-900">Install Zynexon</h3>
          <p className="mt-1 text-sm text-zinc-500">Train your mind daily. Stay consistent.</p>

          <button
            type="button"
            onClick={handleInstallClick}
            className="mt-4 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setShowInstallPopup(false)}
            className="mt-2 w-full rounded-lg py-2 text-sm font-semibold text-zinc-500 transition hover:bg-zinc-100"
          >
            Not now
          </button>
        </div>
      ) : null}
    </main>
  )
}

export default App
