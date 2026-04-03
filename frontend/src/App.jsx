import { useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import ConfirmationModal from './components/ConfirmationModal'
import ColorCountFocusGame from './components/ColorCountFocusGame'
import FocusTapGame from './components/FocusTapGame'
import Navbar from './components/Navbar'
import NumberRecallGame from './components/NumberRecallGame'
import SpeedPatternGame from './components/SpeedPatternGame'
import AuthPage from './components/pages/AuthPage'
import GameHubPage from './components/pages/GameHubPage'
import TasksPage from './components/pages/TasksPage'
import useAuth from './hooks/useAuth'
import useGameSession from './hooks/useGameSession'
import useTasks from './hooks/useTasks'

const ACCESS_TOKEN_KEY = 'zynexon_access_token'
const REFRESH_TOKEN_KEY = 'zynexon_refresh_token'
const BEST_GAME_SCORE_KEY = 'zynexon_best_quick_math_score'
const LAST_TRAINING_RESULT_KEY = 'zynexon_last_training_result'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const GAME_DAILY_MAX_XP = 50
const DAILY_WISDOM = [
  'You are what you repeat.',
  'Discipline beats motivation.',
  'Win the day.',
  'Small wins compound.',
]
const DAILY_TRAINING_GAMES = [
  'Quick Math',
  'Focus Tap',
  'Number Recall',
  'Color Count',
  'Speed Pattern',
]

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function apiUrl(path) {
  if (!API_BASE_URL) {
    return path
  }
  return `${API_BASE_URL}${path}`
}

function getAvatarColor(name) {
  return 'bg-zinc-900'
}

function getBadges(user) {
  const badges = []

  if (user.level >= 1) {
    badges.push({ title: 'Beginner', icon: '⭐' })
  }

  if (user.streak >= 3) {
    badges.push({ title: 'Consistent', icon: '🔥' })
  }

  if (user.streak >= 7) {
    badges.push({ title: 'Focused', icon: '⚡' })
  }

  if (user.xp >= 500) {
    badges.push({ title: 'Elite', icon: '🧠' })
  }

  if (user.level >= 5) {
    badges.push({ title: 'Warrior', icon: '🏆' })
  }

  return badges
}

function OptionGrid({ title, options, value, onSelect }) {
  return (
    <div className="p-4 rounded-2xl border mb-4 bg-white">
      <h3 className="font-semibold mb-3">{title}</h3>

      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <div
            key={opt}
            onClick={() => onSelect(opt)}
            className={`p-4 rounded-xl border text-center cursor-pointer transition ${
              value === opt ? 'border-black bg-black text-white shadow-md' : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400'
            }`}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                onSelect(opt)
              }
            }}
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  )
}

function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    zIndex: 11000,
  })

  setTimeout(() => {
    confetti({
      particleCount: 60,
      spread: 100,
      origin: { y: 0.4 },
      zIndex: 11000,
    })
  }, 300)
}

function formatRelativeTime(isoTime) {
  if (!isoTime) {
    return ''
  }

  const then = new Date(isoTime).getTime()
  if (Number.isNaN(then)) {
    return ''
  }

  const diffMs = Date.now() - then
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) {
    return 'just now'
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
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
    if (!text) {
      return null
    }

    const looksLikeHtml = /<\s*!doctype\s+html|<\s*html/i.test(text)
    if (looksLikeHtml) {
      return { detail: 'Server error. Please try again.' }
    }

    return { detail: text }
  } catch {
    return null
  }
}

function App() {
  const {
    user,
    setUser,
    loading,
    setLoading,
    level,
    setLevel,
    xp,
    setXp,
    streakDays,
    setStreakDays,
    userEmail,
    setUserEmail,
    accessToken,
    setAccessToken,
    authMode,
    setAuthMode,
    nameInput,
    setNameInput,
    emailInput,
    setEmailInput,
    passwordInput,
    setPasswordInput,
    isLoading,
    setIsLoading,
    errorText,
    setErrorText,
    authLoading,
    setAuthLoading,
    userName,
    setUserName,
    nameUpdating,
    setNameUpdating,
    isProfileEditingName,
    setIsProfileEditingName,
  } = useAuth(ACCESS_TOKEN_KEY)

  const {
    selectedTask,
    setSelectedTask,
    justCompletedId,
    setJustCompletedId,
    tasks,
    setTasks,
    completedCount,
    dailyStatusMessage,
  } = useTasks()

  const {
    activeTab,
    setActiveTab,
    gameRoute,
    setGameRoute,
    gameSessionId,
    setGameSessionId,
    gameStarted,
    setGameStarted,
    timeLeft,
    setTimeLeft,
    score,
    setScore,
    bestGameScore,
    setBestGameScore,
    lastTrainingResult,
    setLastTrainingResult,
    currentQuestion,
    setCurrentQuestion,
    userAnswer,
    setUserAnswer,
    gameSubmitting,
    setGameSubmitting,
    gameResult,
    setGameResult,
    animatedGameXp,
    setAnimatedGameXp,
    focusTapSessionId,
    setFocusTapSessionId,
    focusTapSubmitting,
    setFocusTapSubmitting,
    focusTapXpAwarded,
    setFocusTapXpAwarded,
    focusTapResult,
    setFocusTapResult,
    focusTapError,
    setFocusTapError,
    numberRecallSessionId,
    setNumberRecallSessionId,
    numberRecallSubmitting,
    setNumberRecallSubmitting,
    numberRecallXpAwarded,
    setNumberRecallXpAwarded,
    numberRecallResult,
    setNumberRecallResult,
    numberRecallError,
    setNumberRecallError,
    colorCountSessionId,
    setColorCountSessionId,
    colorCountSubmitting,
    setColorCountSubmitting,
    colorCountXpAwarded,
    setColorCountXpAwarded,
    colorCountResult,
    setColorCountResult,
    colorCountError,
    setColorCountError,
    speedPatternSessionId,
    setSpeedPatternSessionId,
    speedPatternSubmitting,
    setSpeedPatternSubmitting,
    speedPatternXpAwarded,
    setSpeedPatternXpAwarded,
    speedPatternResult,
    setSpeedPatternResult,
    speedPatternError,
    setSpeedPatternError,
    deferredPrompt,
    setDeferredPrompt,
    showInstallPopup,
    setShowInstallPopup,
    installEligible,
    setInstallEligible,
    isInstalled,
    setIsInstalled,
    prevLevel,
    setPrevLevel,
    showLevelUp,
    setShowLevelUp,
    pendingLevelUpLevel,
    setPendingLevelUpLevel,
  } = useGameSession(BEST_GAME_SCORE_KEY, LAST_TRAINING_RESULT_KEY)

  const [leaderboardEntries, setLeaderboardEntries] = useState([])
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [yourRank, setYourRank] = useState(null)
  const [equippedBadge, setEquippedBadge] = useState(localStorage.getItem('badge') || null)
  const [bestStreak, setBestStreak] = useState(0)
  const [entry, setEntry] = useState({
    did_you_win_today: '',
    where_did_you_fail_yourself: '',
    mental_state: '',
  })
  const [journalLoading, setJournalLoading] = useState(true)
  const [journalSaving, setJournalSaving] = useState(false)
  const [journalSavedText, setJournalSavedText] = useState('')
  const [journalLastUpdatedAt, setJournalLastUpdatedAt] = useState('')
  const [savedEntry, setSavedEntry] = useState(null)
  const previousCompletedCountRef = useRef(null)
  const shouldFireTaskConfettiRef = useRef(false)
  const shouldFireQuickMathConfettiRef = useRef(false)
  const isInitialLoadRef = useRef(false)
  const speedPatternSessionIdRef = useRef('')

  const requiresNameSetup = Boolean(user && !user.name)
  const profileDisplayName = userName || user?.name || 'User'
  const profileAvatarLetter = profileDisplayName.charAt(0).toUpperCase()
  const bestStreakStorageKey = user?.id ? `zynexon_best_streak_${user.id}` : 'zynexon_best_streak'
  const profileCurrentLevelXp = level * level * 50
  const profileNextLevelXp = (level + 1) * (level + 1) * 50
  const profileProgressXp = Math.max(0, xp - profileCurrentLevelXp)
  const profileNeededXp = Math.max(1, profileNextLevelXp - profileCurrentLevelXp)
  const profileProgressPercent = Math.min(100, Math.max(0, (profileProgressXp / profileNeededXp) * 100))
  const earnedBadges = getBadges({ level, streak: streakDays, xp })
  const showQuickMathResult = activeTab === 'Game' && gameRoute === '/game/quick-math' && (Boolean(gameResult) || gameSubmitting)
  const showFocusTapResult = activeTab === 'Game' && gameRoute === '/game/focus-tap' && (Boolean(focusTapResult) || focusTapSubmitting)
  const showNumberRecallResult = activeTab === 'Game' && gameRoute === '/game/number-recall' && (Boolean(numberRecallResult) || numberRecallSubmitting)
  const showColorCountResult = activeTab === 'Game' && gameRoute === '/game/color-count-focus' && (Boolean(colorCountResult) || colorCountSubmitting)
  const showSpeedPatternResult = activeTab === 'Game' && gameRoute === '/game/speed-pattern' && (Boolean(speedPatternResult) || speedPatternSubmitting)
  const showGameResult = showQuickMathResult || showFocusTapResult || showNumberRecallResult || showColorCountResult || showSpeedPatternResult
  const hasJournalEntryToday = Boolean(savedEntry)
  const taskCounterColorClass = completedCount === 0
    ? 'text-zinc-500'
    : completedCount >= 5
      ? 'text-emerald-600'
      : 'text-blue-600'
  const tasksLeft = Math.max(0, 5 - completedCount)
  const homeProgressContext = !lastTrainingResult
    ? "You haven't trained yet."
    : tasksLeft > 0
      ? `${tasksLeft} task${tasksLeft === 1 ? '' : 's'} left to win today.`
      : 'All tasks cleared. Win secured for today.'
  const dailyWisdom = useMemo(() => {
    const dayNumber = Math.floor(Date.now() / 86400000)
    return DAILY_WISDOM[dayNumber % DAILY_WISDOM.length]
  }, [])
  const dailyTrainingGameLabel = useMemo(() => {
    const dayNumber = Math.floor(Date.now() / 86400000)
    return DAILY_TRAINING_GAMES[dayNumber % DAILY_TRAINING_GAMES.length]
  }, [])

  useEffect(() => {
    const parsedStoredBest = Number(localStorage.getItem(bestStreakStorageKey) || '0')
    const storedBest = Number.isFinite(parsedStoredBest) && parsedStoredBest > 0 ? parsedStoredBest : 0
    const nextBest = Math.max(storedBest, streakDays)

    setBestStreak((prev) => (prev === nextBest ? prev : nextBest))

    if (nextBest !== storedBest) {
      localStorage.setItem(bestStreakStorageKey, String(nextBest))
    }
  }, [bestStreakStorageKey, streakDays])

  function recordLastTrainingResult(label, scoreValue) {
    const parsedScore = Number(scoreValue)
    if (!label || Number.isNaN(parsedScore)) {
      return
    }

    const payload = {
      label,
      score: parsedScore,
    }

    setLastTrainingResult(payload)
    localStorage.setItem(LAST_TRAINING_RESULT_KEY, JSON.stringify(payload))
  }

  function navigate(path) {
    window.history.pushState({}, '', path)
    if (path === '/' || path === '') {
      setActiveTab('Home')
      return
    }

    if (path === '/journal') {
      setActiveTab('Journal')
      return
    }

    if (path === '/leaderboard') {
      setActiveTab('Leaderboard')
      return
    }

    if (path === '/profile') {
      setActiveTab('Profile')
      return
    }

    if (path === '/tasks') {
      setActiveTab('Tasks')
      return
    }

    if (path.startsWith('/game')) {
      setGameRoute(path)
      setActiveTab('Game')
      return
    }

    setActiveTab('Home')
  }

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
        setLoading(false)
        return
      }

      setIsLoading(true)
      setLoading(true)
      setErrorText('')

      try {
        // Parallelize auth/me and daily-tasks fetches
        const [user, dailyTasks] = await Promise.all([
          authedFetch('/api/auth/me/'),
          authedFetch('/api/daily-tasks/'),
        ])

        setUser(user)
        setUserName(user.name || '')
        setUserEmail(user.email)
        setLevel(user.level)
        setXp(user.xp)
        setStreakDays(user.streak)

        setTasks(
          dailyTasks.map((task) => ({
            id: task.id,
            name: task.task_title,
            xp: task.task_xp,
            completed: task.completed,
          })),
        )

        // Only on initial load, set prevLevel to user's current level so level-up popup doesn't trigger on refresh
        if (!isInitialLoadRef.current) {
          setPrevLevel(user.level)
          isInitialLoadRef.current = true
        }
      } catch (error) {
        setErrorText(error.message || 'Could not connect to backend.')
        handleLogout()
      } finally {
        setIsLoading(false)
        setLoading(false)
      }
    }

    loadDashboard()
  }, [accessToken])

  useEffect(() => {
    async function loadPublicSocialProof() {
      try {
        const leaderboard = await fetch(apiUrl('/api/leaderboard/?limit=1'))
        const data = await readApiPayload(leaderboard)
        if (!leaderboard.ok) {
          return
        }

        setTotalPlayers(data?.total_users || 0)
      } catch {
        // Leave social proof hidden if the request fails.
      }
    }

    loadPublicSocialProof()
  }, [])

  useEffect(() => {
    if (activeTab !== 'Leaderboard' || !user) {
      return
    }

    async function loadLeaderboard() {
      try {
        const leaderboard = await authedFetch('/api/leaderboard/?limit=30')
        setLeaderboardEntries(leaderboard.top_users || leaderboard.entries || [])
        setTotalPlayers(leaderboard.total_users || 0)
        setYourRank(leaderboard.your_rank || leaderboard.current_user_rank?.rank || null)
      } catch (error) {
        console.error('Failed to load leaderboard:', error)
      }
    }

    loadLeaderboard()
  }, [activeTab, user])

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
    const previous = previousCompletedCountRef.current
    previousCompletedCountRef.current = completedCount

    if (
      shouldFireTaskConfettiRef.current
      && previous !== null
      && previous < 5
      && completedCount === 5
    ) {
      fireConfetti()
      shouldFireTaskConfettiRef.current = false
    }
  }, [completedCount])

  useEffect(() => {
    // Only show level-up if this is NOT the initial load.
    if (!isInitialLoadRef.current || level <= prevLevel) {
      return
    }

    setPrevLevel(level)

    if (showGameResult || Boolean(selectedTask) || showInstallPopup || showLevelUp) {
      setPendingLevelUpLevel(level)
      return
    }

    setShowLevelUp(true)
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      zIndex: 11000,
    })
  }, [level, prevLevel, showGameResult, selectedTask, showInstallPopup, showLevelUp])

  useEffect(() => {
    if (!pendingLevelUpLevel || showLevelUp || showGameResult || Boolean(selectedTask) || showInstallPopup) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowLevelUp(true)
      setPendingLevelUpLevel(null)
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        zIndex: 11000,
      })
    }, 200)

    return () => window.clearTimeout(timeoutId)
  }, [pendingLevelUpLevel, showLevelUp, showGameResult, selectedTask, showInstallPopup])

  useEffect(() => {
    if (showLevelUp || showGameResult) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [showLevelUp, showGameResult])

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
    if (shouldFireQuickMathConfettiRef.current && gameResult && gameResult.score > 0) {
      fireConfetti()
      shouldFireQuickMathConfettiRef.current = false
    }
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

  useEffect(() => {
    if (!equippedBadge) {
      return
    }

    const stillEarned = earnedBadges.some((badge) => badge.title === equippedBadge)
    if (!stillEarned) {
      setEquippedBadge(null)
      localStorage.removeItem('badge')
    }
  }, [equippedBadge, earnedBadges])

  useEffect(() => {
    async function fetchJournalEntry() {
      if (!user || activeTab !== 'Journal') {
        return
      }

      setJournalLoading(true)
      try {
        const data = await authedFetch('/api/journal/')
        if (data.entry) {
          setEntry({
            did_you_win_today: data.entry.did_you_win_today || '',
            where_did_you_fail_yourself: data.entry.where_did_you_fail_yourself || '',
            mental_state: data.entry.mental_state || '',
          })
          setSavedEntry(data.entry)
          setJournalLastUpdatedAt(data.entry.updated_at || '')
        } else {
          setEntry({
            did_you_win_today: '',
            where_did_you_fail_yourself: '',
            mental_state: '',
          })
          setSavedEntry(null)
          setJournalLastUpdatedAt('')
        }
        setJournalSavedText('')
      } catch (error) {
        setJournalSavedText(error.message || 'Could not load journal entry.')
      } finally {
        setJournalLoading(false)
      }
    }

    void fetchJournalEntry()
  }, [activeTab, user])

  useEffect(() => {
    function syncRouteFromPath() {
      const path = window.location.pathname.toLowerCase()
      if (path === '/' || path === '') {
        setActiveTab('Home')
        return
      }
      if (path === '/journal') {
        setActiveTab('Journal')
        return
      }
      if (path === '/leaderboard') {
        setActiveTab('Leaderboard')
        return
      }
      if (path === '/profile') {
        setActiveTab('Profile')
        return
      }
      if (path === '/tasks') {
        setActiveTab('Tasks')
        return
      }
      if (path === '/game/quick-math') {
        setActiveTab('Game')
        setGameRoute('/game/quick-math')
        return
      }
      if (path === '/game/focus-tap') {
        setActiveTab('Game')
        setGameRoute('/game/focus-tap')
        return
      }
      if (path === '/game/number-recall') {
        setActiveTab('Game')
        setGameRoute('/game/number-recall')
        return
      }
      if (path === '/game/color-count-focus') {
        setActiveTab('Game')
        setGameRoute('/game/color-count-focus')
        return
      }
      if (path === '/game/speed-pattern') {
        setActiveTab('Game')
        setGameRoute('/game/speed-pattern')
        return
      }
      if (path === '/game') {
        setActiveTab('Game')
        setGameRoute('/game')
      }
    }

    syncRouteFromPath()
    window.addEventListener('popstate', syncRouteFromPath)
    return () => window.removeEventListener('popstate', syncRouteFromPath)
  }, [])

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
      setActiveTab('Home')
      setGameRoute('/game')
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

  async function handleProfileSaveName(event) {
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
      setIsProfileEditingName(false)
    } catch (error) {
      setErrorText(error.message || 'Could not update name.')
    } finally {
      setNameUpdating(false)
    }
  }

  async function saveJournalEntry() {
    setJournalSaving(true)
    setJournalSavedText('')

    try {
      const data = await authedFetch('/api/journal/', {
        method: 'POST',
        body: JSON.stringify(entry),
      })

      if (data.entry) {
        setSavedEntry(data.entry)
        setJournalLastUpdatedAt(data.entry.updated_at || '')
      }

      if (typeof data.total_xp === 'number') {
        setXp(data.total_xp)
      }
      if (typeof data.level === 'number') {
        setLevel(data.level)
      }
      if (typeof data.streak === 'number') {
        setStreakDays(data.streak)
      }

      if ((data.xp_awarded || 0) > 0) {
        setJournalSavedText(`Saved ✅ +${data.xp_awarded} XP`)
      } else {
        setJournalSavedText('Entry updated. XP already claimed today.')
      }
    } catch (error) {
      setJournalSavedText(error.message || 'Could not save journal entry.')
    } finally {
      setJournalSaving(false)
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
    setTotalPlayers(0)
    setYourRank(null)
    setActiveTab('Home')
    setGameRoute('/game')
    setGameSessionId('')
    setGameStarted(false)
    setTimeLeft(30)
    setScore(0)
    setCurrentQuestion(null)
    setUserAnswer('')
    setGameSubmitting(false)
    setGameResult(null)
    setFocusTapSessionId('')
    setFocusTapSubmitting(false)
    setFocusTapXpAwarded(null)
    setFocusTapResult(null)
    setFocusTapError('')
    setNumberRecallSessionId('')
    setNumberRecallSubmitting(false)
    setNumberRecallXpAwarded(null)
    setNumberRecallResult(null)
    setNumberRecallError('')
    setColorCountSessionId('')
    setColorCountSubmitting(false)
    setColorCountXpAwarded(null)
    setColorCountResult(null)
    setColorCountError('')
    setSpeedPatternSessionId('')
    setSpeedPatternSubmitting(false)
    setSpeedPatternXpAwarded(null)
    setSpeedPatternResult(null)
    setSpeedPatternError('')
    setEntry({ did_you_win_today: '', where_did_you_fail_yourself: '', mental_state: '' })
    setSavedEntry(null)
    setJournalLoading(true)
    setJournalSaving(false)
    setJournalSavedText('')
    setJournalLastUpdatedAt('')
    setLoading(false)
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
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'quick_math' }),
      })
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

  async function submitGameResult(finalScore, sessionId = gameSessionId) {
    if (!sessionId) {
      setErrorText('Game session was not created. Please start again.')
      return
    }

    setGameSubmitting(true)
    try {
      setErrorText('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
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
      recordLastTrainingResult('Quick Math', data.score)
      shouldFireQuickMathConfettiRef.current = true
      setInstallEligible(true)
      if (sessionId === gameSessionId) {
        setGameSessionId('')
      }
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
      shouldFireTaskConfettiRef.current = true

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

  async function handleFocusTapStart() {
    try {
      setFocusTapError('')
      setFocusTapXpAwarded(null)
      setFocusTapResult(null)
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'focus_tap' }),
      })
      setFocusTapSessionId(data.session_id)
    } catch (error) {
      setFocusTapSessionId('')
      setFocusTapError(error.message || 'Could not start Focus Tap session.')
    }
  }

  async function handleFocusTapFinish(result) {
    setInstallEligible(true)

    if (!result || !focusTapSessionId) {
      return
    }

    setFocusTapSubmitting(true)
    try {
      setFocusTapError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: focusTapSessionId,
          score: result.score,
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      const refreshedUser = await authedFetch('/api/auth/me/')
      setUser(refreshedUser)
      setStreakDays(refreshedUser.streak)
      setFocusTapXpAwarded(data.xp_awarded)
      setFocusTapResult({
        xpAwarded: data.xp_awarded,
        dailyCap: data.daily_cap,
        remainingToday: data.remaining_today,
        cappedByDailyLimit: data.capped_by_daily_limit,
      })
      recordLastTrainingResult('Focus Tap', result.score)
      setFocusTapSessionId('')
    } catch (error) {
      setFocusTapError(error.message || 'Could not submit Focus Tap result.')
    } finally {
      setFocusTapSubmitting(false)
    }
  }

  async function handleNumberRecallStart() {
    try {
      setNumberRecallError('')
      setNumberRecallXpAwarded(null)
      setNumberRecallResult(null)
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'number_recall' }),
      })
      setNumberRecallSessionId(data.session_id)
      return true
    } catch (error) {
      setNumberRecallSessionId('')
      setNumberRecallError(error.message || 'Could not start Number Recall session.')
      return false
    }
  }

  async function handleNumberRecallFinish(result) {
    setInstallEligible(true)

    if (!result || !numberRecallSessionId) {
      return
    }

    setNumberRecallSubmitting(true)
    try {
      setNumberRecallError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: numberRecallSessionId,
          score: result.score,
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      const refreshedUser = await authedFetch('/api/auth/me/')
      setUser(refreshedUser)
      setStreakDays(refreshedUser.streak)
      setNumberRecallXpAwarded(data.xp_awarded)
      setNumberRecallResult({
        xpAwarded: data.xp_awarded,
        dailyCap: data.daily_cap,
        remainingToday: data.remaining_today,
        cappedByDailyLimit: data.capped_by_daily_limit,
      })
      recordLastTrainingResult('Number Recall', result.score)
      setNumberRecallSessionId('')
      if (result.outcome === 'win') {
        fireConfetti()
      }
    } catch (error) {
      setNumberRecallError(error.message || 'Could not submit Number Recall result.')
    } finally {
      setNumberRecallSubmitting(false)
    }
  }

  async function handleColorCountStart() {
    try {
      setColorCountError('')
      setColorCountXpAwarded(null)
      setColorCountResult(null)
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'color_count_focus' }),
      })
      setColorCountSessionId(data.session_id)
      return true
    } catch (error) {
      setColorCountSessionId('')
      setColorCountError(error.message || 'Could not start Color Count Focus session.')
      return false
    }
  }

  async function handleColorCountFinish(result) {
    setInstallEligible(true)

    if (!result || !colorCountSessionId) {
      return
    }

    setColorCountSubmitting(true)
    try {
      setColorCountError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: colorCountSessionId,
          score: result.score,
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      const refreshedUser = await authedFetch('/api/auth/me/')
      setUser(refreshedUser)
      setStreakDays(refreshedUser.streak)
      setColorCountXpAwarded(data.xp_awarded)
      setColorCountResult({
        xpAwarded: data.xp_awarded,
        dailyCap: data.daily_cap,
        remainingToday: data.remaining_today,
        cappedByDailyLimit: data.capped_by_daily_limit,
      })
      recordLastTrainingResult('Color Count Focus', result.score)
      setColorCountSessionId('')
      if (result.outcome === 'win') {
        fireConfetti()
      }
    } catch (error) {
      setColorCountError(error.message || 'Could not submit Color Count Focus result.')
    } finally {
      setColorCountSubmitting(false)
    }
  }

  async function handleSpeedPatternStart() {
    try {
      setSpeedPatternError('')
      setSpeedPatternXpAwarded(null)
      setSpeedPatternResult(null)
      const data = await authedFetch('/api/game/start/', {
        method: 'POST',
        body: JSON.stringify({ game_type: 'speed_pattern' }),
      })
      setSpeedPatternSessionId(data.session_id)
      speedPatternSessionIdRef.current = data.session_id
      return true
    } catch (error) {
      setSpeedPatternSessionId('')
      speedPatternSessionIdRef.current = ''
      setSpeedPatternError(error.message || 'Could not start Speed Pattern session.')
      return false
    }
  }

  async function handleSpeedPatternFinish(result) {
    setInstallEligible(true)

    const activeSessionId = speedPatternSessionIdRef.current

    if (!result) {
      return false
    }

    if (!activeSessionId) {
      setSpeedPatternError('No active session. Please restart the game.')
      return false
    }

    setSpeedPatternSubmitting(true)
    try {
      setSpeedPatternError('')
      const data = await authedFetch('/api/game/submit/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: activeSessionId,
          score: result.score,
        }),
      })

      setXp(data.total_xp)
      setLevel(data.level)
      try {
        const refreshedUser = await authedFetch('/api/auth/me/')
        setUser(refreshedUser)
        setStreakDays(refreshedUser.streak)
      } catch {
        // Submission already succeeded; profile refresh can recover later.
      }
      setSpeedPatternXpAwarded(data.xp_awarded)
      setSpeedPatternResult({
        xpAwarded: data.xp_awarded,
        dailyCap: data.daily_cap,
        remainingToday: data.remaining_today,
        cappedByDailyLimit: data.capped_by_daily_limit,
      })
      recordLastTrainingResult('Speed Pattern', result.score)
      setSpeedPatternSessionId('')
      speedPatternSessionIdRef.current = ''
      if (result.outcome === 'win') {
        fireConfetti()
      }
      return true
    } catch (error) {
      setSpeedPatternError(error.message || 'Could not submit Speed Pattern result.')
      return undefined
    } finally {
      setSpeedPatternSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col items-center justify-center px-5 py-8 bg-[#f8f6f1]">
        <div className="text-center space-y-6">
          <div className="text-3xl font-black tracking-[0.18em] text-zinc-900">
            ZYNEXON
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">
            The War Within
          </p>
          <div className="flex gap-1.5 justify-center mt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-zinc-900"
                style={{
                  animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`
                }}
              />
            ))}
          </div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Loading your war room...
          </p>
        </div>
        <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); opacity: 0.4; }
            50% { transform: translateY(-8px); opacity: 1; }
          }
        `}</style>
      </main>
    )
  }

  if (!user) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        handleAuthSubmit={handleAuthSubmit}
        authLoading={authLoading}
        nameInput={nameInput}
        setNameInput={setNameInput}
        emailInput={emailInput}
        setEmailInput={setEmailInput}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        errorText={errorText}
        activeWarriorsCount={totalPlayers}
      />
    )
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col px-5 pt-3 pb-24 space-y-7 relative bg-[#f8f6f1]">
      <div className="mt-0 px-1 py-1 text-center">
        <h1 className="text-2xl font-bold tracking-wide text-zinc-900">ZYNEXON</h1>
      </div>

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
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-zinc-900 p-4 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-300">Total Players</p>
                <h3 className="mt-1 text-2xl font-black">{totalPlayers}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-300">Your Rank</p>
                <h3 className="mt-1 text-2xl font-black">{yourRank ? `#${yourRank}` : '—'}</h3>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-zinc-900">Top 30 Players</h3>

          <div className="space-y-2.5">
            {leaderboardEntries.map((entry, index) => {
              const badge = rankMeta(entry.rank)

              return (
                <div
                  key={entry.user_id}
                  className={`rounded-2xl border px-3 py-3 transition ${entry.is_current_user ? 'border-zinc-900 bg-zinc-100' : 'border-zinc-200 bg-white'}`}
                >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex min-w-[68px] items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${badge.className}`}>
                      <span>#{entry.rank || index + 1}</span>
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
      ) : activeTab === 'Journal' ? (
        <section className="space-y-5">
          {journalLoading ? (
            <div className="py-6 text-center text-sm font-semibold text-zinc-500">Loading journal...</div>
          ) : null}

          {!journalLoading ? (
            <>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Daily Debrief</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">Honest answers only.</h1>
            <p className="mt-1 text-sm font-semibold text-zinc-500">No lying to yourself here.</p>
          </div>

          <OptionGrid
            title="Did you win today?"
            options={['Crushed It', 'Solid Day', 'Average', 'Lost The Day', 'Wasted It', 'Barely Survived']}
            value={entry.did_you_win_today}
            onSelect={(val) => setEntry({ ...entry, did_you_win_today: val })}
          />

          <OptionGrid
            title="Where did you fail yourself?"
            options={['Procrastinated', 'Poor Focus', 'Bad Diet', 'No Training', 'Bad Mindset', 'None']}
            value={entry.where_did_you_fail_yourself}
            onSelect={(val) => setEntry({ ...entry, where_did_you_fail_yourself: val })}
          />

          <OptionGrid
            title="What's your mental state right now?"
            options={['Locked In', 'Motivated', 'Drained', 'Anxious', 'Numb', 'At Peace']}
            value={entry.mental_state}
            onSelect={(val) => setEntry({ ...entry, mental_state: val })}
          />

          <button
            className="w-full mt-4 bg-zinc-900 text-white p-3 rounded-xl font-bold transition hover:bg-zinc-800"
            onClick={saveJournalEntry}
            type="button"
            disabled={journalSaving}
          >
            {journalSaving ? 'Saving...' : hasJournalEntryToday ? 'Update Entry' : 'Save Entry'}
          </button>

          {journalSavedText ? <p className="text-xs text-center text-zinc-500">{journalSavedText}</p> : null}

          {journalLastUpdatedAt ? (
            <p className="text-xs text-center text-zinc-500">
              Last updated: {new Date(journalLastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({formatRelativeTime(journalLastUpdatedAt)})
            </p>
          ) : null}

          {savedEntry ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
              <h3 className="mb-3 font-semibold text-zinc-900">Today's Entry</h3>
              <div className="grid gap-3">
                {[
                  ['Did you win today?', savedEntry.did_you_win_today],
                  ['Where did you fail yourself?', savedEntry.where_did_you_fail_yourself],
                  ["What's your mental state right now?", savedEntry.mental_state],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[1.4fr_1fr] gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</p>
                    <p className="text-sm font-semibold text-right text-zinc-900">{value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {errorText ? <p className="text-xs font-semibold text-red-600">{errorText}</p> : null}
          <div className="h-2" />
            </>
          ) : null}
        </section>
      ) : activeTab === 'Game' ? (
        gameRoute === '/game/quick-math' ? (
          <section className="space-y-4">
            <button
              type="button"
              onClick={() => navigate('/game')}
              className="text-xs font-bold uppercase tracking-widest text-zinc-500"
            >
              Back to Games
            </button>

            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center">
              <h2 className="text-2xl font-black tracking-tight text-zinc-950">Quick Math</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Solve as many as you can in 30 seconds
              </p>
            </div>

            {!gameStarted && !gameResult && !gameSubmitting ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center space-y-4">
                <p className="text-sm font-semibold text-zinc-600">Beat your high score and farm clean XP.</p>
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
                >
                  Start Quick Math
                </button>
              </div>
            ) : null}

            {gameSubmitting && !gameResult ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center space-y-2">
                <p className="text-base font-semibold text-zinc-900">Submitting results...</p>
                <p className="text-sm text-zinc-500">Storing your score and XP.</p>
              </div>
            ) : null}

            {gameStarted && currentQuestion ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-zinc-700">Time: {timeLeft}s</p>
                  <p className="text-sm font-bold text-zinc-700">Score: {score}</p>
                </div>

                <div className="text-center">
                  <p className="text-3xl font-black tracking-tight text-zinc-950">
                    {currentQuestion.num1} {currentQuestion.operator} {currentQuestion.num2}
                  </p>
                </div>

                <form onSubmit={handleSubmitAnswer} className="space-y-3">
                  <input
                    type="number"
                    value={userAnswer}
                    onChange={(event) => setUserAnswer(event.target.value)}
                    autoFocus
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                    placeholder="Your answer"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
                  >
                    Submit
                  </button>
                </form>
              </div>
            ) : null}

            {gameResult ? (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-3">
                  <h3 className="text-2xl font-black text-zinc-950">Round Complete</h3>
                  <p className="text-sm font-semibold text-zinc-600">Score: {gameResult.score}</p>
                  <p className="text-sm font-semibold text-zinc-600">XP earned: +{Math.floor(animatedGameXp)}</p>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Best: {bestGameScore}</p>
                  {gameResult.capped_by_daily_limit ? (
                    <p className="text-xs font-semibold text-amber-600">Daily game XP cap reached.</p>
                  ) : null}
                  <div className="pt-2 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleStartGame}
                      disabled={gameSubmitting}
                      className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                    >
                      {gameSubmitting ? 'Submitting...' : 'Play Again'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/game')}
                      className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
                    >
                      Main Menu
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : gameRoute === '/game/focus-tap' ? (
          <FocusTapGame
            onMainMenu={() => navigate('/game')}
            onGameStart={handleFocusTapStart}
            onGameFinished={handleFocusTapFinish}
            submitting={focusTapSubmitting}
            awardedXp={focusTapXpAwarded}
            resultMeta={focusTapResult}
            errorText={focusTapError}
          />
        ) : gameRoute === '/game/number-recall' ? (
          <NumberRecallGame
            onMainMenu={() => navigate('/game')}
            onGameStart={handleNumberRecallStart}
            onGameFinished={handleNumberRecallFinish}
            submitting={numberRecallSubmitting}
            awardedXp={numberRecallXpAwarded}
            resultMeta={numberRecallResult}
            errorText={numberRecallError}
          />
        ) : gameRoute === '/game/color-count-focus' ? (
          <ColorCountFocusGame
            onMainMenu={() => navigate('/game')}
            onGameStart={handleColorCountStart}
            onGameFinished={handleColorCountFinish}
            submitting={colorCountSubmitting}
            awardedXp={colorCountXpAwarded}
            resultMeta={colorCountResult}
            errorText={colorCountError}
          />
        ) : gameRoute === '/game/speed-pattern' ? (
          <SpeedPatternGame
            onMainMenu={() => navigate('/game')}
            onGameStart={handleSpeedPatternStart}
            onGameFinished={handleSpeedPatternFinish}
            submitting={speedPatternSubmitting}
            awardedXp={speedPatternXpAwarded}
            resultMeta={speedPatternResult}
            errorText={speedPatternError}
          />
        ) : (
          <GameHubPage onBack={() => navigate('/')} onNavigate={navigate} />
        )
      ) : activeTab === 'Profile' ? (
        <section className="space-y-5">
          <div className="relative flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('Home')}
              className="absolute left-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
            >
              Back
            </button>
            <h2 className="text-xl font-black tracking-tight text-zinc-900">Profile</h2>
          </div>

          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto ${getAvatarColor(profileDisplayName)}`}>
            {profileAvatarLetter}
          </div>

          <div className="text-center">
            <h2 className="text-xl font-semibold text-center mt-3">{profileDisplayName}</h2>
            {!isProfileEditingName ? (
              <button
                type="button"
                className="mt-3 inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-100"
                onClick={() => {
                  setNameInput(profileDisplayName)
                  setIsProfileEditingName(true)
                }}
              >
                Change Name
              </button>
            ) : null}
          </div>

          {isProfileEditingName ? (
            <form onSubmit={handleProfileSaveName} className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
              <input
                type="text"
                required
                maxLength={30}
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={nameUpdating}
                  className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                >
                  {nameUpdating ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileEditingName(false)
                    setNameInput('')
                  }}
                  className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          <section className="mt-4 rounded-2xl border border-zinc-900 bg-zinc-900 px-4 py-4 text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">War Room Status</p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Level</p>
                <p className="mt-1 text-2xl font-black leading-none">{level}</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">STREAK</p>
                <p className="mt-1 text-2xl font-black leading-none">{streakDays}</p>
              </div>
            </div>

            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-2 rounded-full bg-white transition-all duration-700 ease-out"
                  style={{ width: `${profileProgressPercent}%` }}
                />
              </div>
              <p className="mt-2 text-center text-xs font-semibold text-zinc-200">{xp} / {profileNextLevelXp} XP to next level</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Total XP</p>
                <p className="mt-1 text-xl font-black leading-none">{xp}</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Best Streak</p>
                <p className="mt-1 text-xl font-black leading-none">{bestStreak}</p>
              </div>
            </div>
          </section>

          <h3 className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">ACHIEVEMENTS</h3>
          {equippedBadge ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              <span>🏅</span>
              <span>Equipped: {equippedBadge}</span>
            </div>
          ) : null}
          <div className="mt-2 space-y-2">
            {earnedBadges.map((badge, index) => (
              <div
                key={index}
                className={`p-3 border rounded-lg flex items-center gap-3 bg-white cursor-pointer transition ${equippedBadge === badge.title ? 'border-indigo-500 bg-indigo-50' : 'border-zinc-200 hover:bg-zinc-50'}`}
                onClick={() => {
                  setEquippedBadge(badge.title)
                  localStorage.setItem('badge', badge.title)
                }}
              >
                <span>{badge.icon}</span>
                <span>{badge.title}</span>
              </div>
            ))}
          </div>

          <section className="rounded-3xl border border-zinc-200 bg-white px-4 py-3 shadow-sm flex items-center justify-between mt-6">
            <p className="text-xs font-semibold text-zinc-500">Signed in as {userName || userEmail}</p>
            <button type="button" className="text-xs font-bold text-zinc-900" onClick={handleLogout}>
              Logout
            </button>
          </section>

          {errorText ? <p className="text-xs font-semibold text-red-600">{errorText}</p> : null}
        </section>
      ) : activeTab === 'Tasks' ? (
        <TasksPage
          onBack={() => navigate('/')}
          completedCount={completedCount}
          tasks={tasks}
          isLoading={isLoading}
          onCompleteTask={handleAskComplete}
          justCompletedId={justCompletedId}
          streakDays={streakDays}
          dailyStatusMessage={dailyStatusMessage}
          errorText={errorText}
        />
      ) : (
        <div className="max-w-md mx-auto px-4 pb-24 w-full">
        <section className="space-y-6">
          <div className="mt-4 p-5 rounded-2xl bg-zinc-900 shadow-xl border border-zinc-800">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">War Room Status</p>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Level {level}</h2>
              <span className="text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full flex items-center gap-1 hover:scale-[1.02] transition-all duration-200">🔥 {streakDays} day streak</span>
            </div>

            <div className="mt-4 w-full bg-zinc-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-white h-2 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${profileProgressPercent}%` }}
              />
            </div>

            <div className="flex justify-between mt-2 text-xs text-zinc-300">
              <span>{xp} XP</span>
              <span>{profileNextLevelXp} XP</span>
            </div>
          </div>

          <section className="mt-6 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-5 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">War Doctrine</p>
            <p className="mt-3 text-lg font-black leading-snug text-white">{dailyWisdom}</p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">ZYNEXON / The War Within</p>
          </section>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div
              onClick={() => navigate('/tasks')}
              className="px-4 pt-4 pb-5 rounded-2xl bg-white border border-zinc-200 shadow-[0_8px_20px_rgba(0,0,0,0.05)] cursor-pointer hover:scale-[1.02] transition-all duration-200"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  navigate('/tasks')
                }
              }}
            >
              <h3 className="font-semibold text-base">Daily Tasks</h3>
              <p className="text-xs text-gray-500 mt-1">Complete your daily goals</p>
              <p className={`text-sm font-semibold mt-3 ${taskCounterColorClass}`}>{completedCount}/5 completed</p>
            </div>

            <div
              onClick={() => navigate('/game')}
              className="px-4 pt-4 pb-5 rounded-2xl bg-white border border-zinc-200 shadow-[0_8px_20px_rgba(0,0,0,0.05)] cursor-pointer hover:scale-[1.02] transition-all duration-200"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  navigate('/game')
                }
              }}
            >
              <h3 className="font-semibold text-base">Training Hub</h3>
              <p className="text-xs text-gray-500 mt-1">Physical training + mental training</p>
              <p className="text-[13px] font-semibold mt-3 text-blue-600 whitespace-nowrap">{dailyTrainingGameLabel}</p>
            </div>
          </div>

          <p className="text-sm font-bold text-zinc-800">{homeProgressContext}</p>

          {errorText ? <p className="text-xs font-semibold text-red-600">{errorText}</p> : null}
        </section>
        </div>
      ))}

      {!requiresNameSetup ? (
        <Navbar
          activeTab={activeTab}
          onChange={(tab) => {
            if (tab === 'Home') {
              navigate('/')
              return
            }
            if (tab === 'Journal') {
              navigate('/journal')
              return
            }
            if (tab === 'Leaderboard') {
              navigate('/leaderboard')
              return
            }
            if (tab === 'Profile') {
              navigate('/profile')
            }
          }}
        />
      ) : null}

      <ConfirmationModal
        open={Boolean(selectedTask)}
        taskName={selectedTask?.name || ''}
        onYes={handleConfirmYes}
        onNo={handleConfirmNo}
        onClose={() => setSelectedTask(null)}
      />

      {showLevelUp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 text-center w-80 animate-[pop_0.3s_ease-out]">
            <h2 className="text-xl font-bold mb-2">
              LEVEL UP 🚀
            </h2>
            <p className="text-gray-500 mb-3">
              You reached Level {level}
            </p>
            <p className="text-indigo-500 font-semibold mb-4">
              Keep stacking wins.
            </p>
            <button
              onClick={() => setShowLevelUp(false)}
              className="w-full bg-black text-white p-3 rounded-xl font-semibold transition hover:bg-zinc-800"
            >
              Continue
            </button>
          </div>
        </div>
      )}

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
