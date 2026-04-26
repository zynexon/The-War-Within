import { useCallback, useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function apiUrl(path) {
  if (!API_BASE_URL) {
    return path
  }
  return `${API_BASE_URL}${path}`
}

// -- Mini Quick Math for challenge playing --
function generateQuestion() {
  const num1 = Math.floor(Math.random() * 20) + 1
  const num2 = Math.floor(Math.random() * 20) + 1
  const ops = ['+', '-', '*']
  const op = ops[Math.floor(Math.random() * ops.length)]
  const answer = op === '+' ? num1 + num2 : op === '-' ? num1 - num2 : num1 * num2
  return { num1, num2, op, answer }
}

// -- Helpers --
function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  const el = document.createElement('textarea')
  el.value = text
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
  return Promise.resolve()
}

function getShareUrl(challengeId) {
  const base = window.location.origin
  return `${base}/?challenge=${challengeId}`
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

async function publicFetch(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || data.detail || 'Request failed.')
  }

  return data
}

const GAME_ICONS = {
  quick_math: '⚡',
  focus_tap: '🎯',
  number_recall: '🧠',
  color_count_focus: '🎨',
  speed_pattern: '📐',
  reverse_order: '🔀',
  number_stack: '🔢',
  pattern_sequence: '🔮',
  logic_grid: '♟️',
  reaction_tap: '⚡',
}

// -- Challenge Create Button --
export function ChallengeCreateButton({ gameType, score, authedFetch, className = '', onChallengeCreated }) {
  const [phase, setPhase] = useState('idle') // idle | wager | creating | created | error
  const [wager, setWager] = useState(0)
  const [challenge, setChallenge] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setPhase('creating')
    setError('')
    try {
      const data = await authedFetch('/api/challenges/create/', {
        method: 'POST',
        body: JSON.stringify({
          game_type: gameType,
          challenger_score: score,
          xp_wager: wager,
          seed: {},
        }),
      })
      setChallenge(data.challenge)
      setPhase('created')
      if (onChallengeCreated) {
        onChallengeCreated(data.challenge)
      }
    } catch (err) {
      setError(err.message || 'Could not create challenge.')
      setPhase('error')
    }
  }

  async function handleCopy() {
    if (!challenge) return
    await copyToClipboard(getShareUrl(challenge.id))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShare() {
    if (!challenge) return
    const url = getShareUrl(challenge.id)
    const text = `I scored ${score} in ZYNEXON ${challenge.game_type_label}. Think you can beat me? ⚔️`
    if (navigator.share) {
      navigator.share({ title: 'ZYNEXON Challenge', text, url }).catch(() => {
        void handleCopy()
      })
    } else {
      void handleCopy()
    }
  }

  if (phase === 'created' && challenge) {
    return (
      <div className={`rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{GAME_ICONS[gameType] || '⚔️'}</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Challenge Created</p>
            <p className="text-sm font-black text-white">Send this to a friend ⚔️</p>
          </div>
        </div>

        {challenge.xp_wager > 0 && (
          <div className="rounded-xl border border-amber-800 bg-amber-950/40 px-3 py-2 text-center">
            <p className="text-xs font-black text-amber-400">💰 {challenge.xp_wager} XP wagered</p>
            <p className="text-[10px] font-semibold text-amber-700">Winner takes the XP</p>
          </div>
        )}

        <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2">
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Challenge link</p>
          <p className="text-[10px] font-mono text-zinc-300 break-all">{getShareUrl(challenge.id)}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="rounded-xl bg-white px-3 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-950 transition hover:bg-zinc-100 active:scale-95"
          >
            {copied ? '✓ Copied!' : '📤 Share'}
          </button>
          <button
            type="button"
            onClick={() => setPhase('idle')}
            className="rounded-xl border border-zinc-700 px-3 py-2.5 text-xs font-bold text-zinc-400 transition hover:bg-zinc-800"
          >
            Done
          </button>
        </div>

        <p className="text-center text-[9px] font-semibold text-zinc-600">
          Expires in {challenge.hours_remaining}h • {challenge.status}
        </p>
      </div>
    )
  }

  if (phase === 'wager') {
    return (
      <div className={`rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 ${className}`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Set XP Wager</p>
        <p className="text-xs font-semibold text-zinc-400 leading-relaxed">
          If your opponent beats you, they steal your wagered XP. If you win, you keep it.
        </p>
        <div className="flex gap-2 flex-wrap">
          {[0, 10, 25, 50, 100].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setWager(amt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                wager === amt
                  ? 'border-white bg-white text-zinc-950'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {amt === 0 ? 'No wager' : `${amt} XP`}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              void handleCreate()
            }}
            className="rounded-xl bg-white px-3 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-950 transition hover:bg-zinc-100 active:scale-95"
          >
            ⚔️ Create Challenge
          </button>
          <button
            type="button"
            onClick={() => setPhase('idle')}
            className="rounded-xl border border-zinc-700 px-3 py-2.5 text-xs font-bold text-zinc-400 transition hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'creating') {
    return (
      <div className={`rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-center ${className}`}>
        <p className="text-xs font-semibold text-zinc-400">Creating challenge...</p>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setPhase('wager')}
      className={`w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-left transition hover:border-zinc-500 active:scale-[0.98] ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Challenge a friend</p>
          <p className="text-sm font-black text-white">⚔️ Send 1v1 Duel</p>
        </div>
        <span className="text-2xl">{GAME_ICONS[gameType] || '⚔️'}</span>
      </div>
      {error ? <p className="mt-1 text-[10px] font-semibold text-red-400">{error}</p> : null}
    </button>
  )
}

// -- In-app Quick Math mini-game for challenges --
function QuickMathChallenge({ targetScore, onFinish, challengerName }) {
  const [timeLeft, setTimeLeft] = useState(30)
  const [score, setScore] = useState(0)
  const [question, setQuestion] = useState(() => generateQuestion())
  const [answer, setAnswer] = useState('')
  const [done, setDone] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          setDone(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => {
    if (done) onFinish(score)
  }, [done, score, onFinish])

  function handleSubmit(e) {
    e.preventDefault()
    const parsed = Number.parseInt(answer, 10)
    if (!Number.isNaN(parsed) && parsed === question.answer) {
      setScore((s) => s + 1)
    }
    setAnswer('')
    setQuestion(generateQuestion())
    inputRef.current?.focus()
  }

  const pct = (timeLeft / 30) * 100

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Beating {challengerName}'s {targetScore}
          </span>
          <span className="text-lg font-black text-white tabular-nums">{score}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-red-500' : 'bg-white'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={`mt-1 text-right text-[10px] font-black ${timeLeft <= 5 ? 'text-red-400' : 'text-zinc-600'}`}>
          {timeLeft}s
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white px-5 py-8 text-center shadow-sm">
        <p className="text-4xl font-black tracking-tight text-zinc-950 tabular-nums">
          {question.num1}
          <span className="mx-3 text-zinc-400">{question.op === '*' ? '×' : question.op}</span>
          {question.num2}
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            autoFocus
            className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-xl font-black outline-none focus:border-zinc-900 tabular-nums"
            placeholder="?"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black uppercase tracking-wider text-white"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  )
}

// -- Challenge Result Screen --
function ChallengeResultScreen({
  challenge,
  yourScore,
  isAuthenticated,
  xpGained,
  onLogin,
  onRegister,
  onClose,
}) {
  const theirScore = challenge.challenger_score
  const theirName = challenge.challenger.name || 'Challenger'
  const gameLabel = challenge.game_type_label || challenge.game_type
  const won = yourScore > theirScore
  const tied = yourScore === theirScore

  useEffect(() => {
    if (won) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 11000 })
    }
  }, [won])

  return (
    <div className="space-y-4">
      <div className={`rounded-3xl border p-6 text-center relative overflow-hidden ${
        won ? 'border-emerald-700 bg-emerald-950'
          : tied ? 'border-zinc-700 bg-zinc-950'
            : 'border-red-800 bg-red-950'
      }`}>
        <div className="pointer-events-none absolute right-4 top-2 text-[100px] font-black leading-none opacity-[0.06] select-none">
          {won ? 'W' : tied ? '=' : 'L'}
        </div>
        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase tracking-[0.32em] text-zinc-500 mb-3">
            1v1 Result - {gameLabel}
          </p>
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="text-center">
              <p className="text-4xl font-black tabular-nums text-white">{yourScore}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">You</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-black ${won ? 'text-emerald-400' : tied ? 'text-zinc-400' : 'text-red-400'}`}>
                {won ? 'WIN' : tied ? 'TIE' : 'LOSS'}
              </p>
              <p className="text-[9px] text-zinc-600 mt-1">vs</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black tabular-nums text-white">{theirScore}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">{theirName}</p>
            </div>
          </div>

          {xpGained > 0 && (
            <div className="rounded-xl border border-amber-700 bg-amber-950/50 px-4 py-2 text-center">
              <p className="text-sm font-black text-amber-400">+{xpGained} XP stolen 💰</p>
            </div>
          )}

          <p className="mt-3 text-xs font-semibold text-zinc-400 leading-relaxed">
            {won
              ? `You crushed ${theirName}'s score by ${yourScore - theirScore}. Send them a rematch.`
              : tied
                ? `Dead even with ${theirName}. Rematch to break the tie.`
                : `${theirName} beat you by ${theirScore - yourScore}. Train harder.`}
          </p>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400 mb-1">
              Your score disappears when you close this tab
            </p>
            <h3 className="text-lg font-black text-zinc-950 leading-tight">
              Create a free account to save your result and challenge others.
            </h3>
          </div>
          <button
            type="button"
            onClick={onRegister}
            className="w-full rounded-2xl bg-zinc-950 px-4 py-4 text-sm font-black uppercase tracking-wider text-white active:scale-[0.98]"
          >
            Create Account - Free
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-600"
          >
            Already have an account? Log in
          </button>
        </div>
      )}

      {isAuthenticated && (
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800"
        >
          Back to Home
        </button>
      )}
    </div>
  )
}

// -- Challenge Landing Page (shown when ?challenge=uuid in URL) --
export function ChallengeLandingPage({
  challengeId,
  user,
  authedFetch,
  onLogin,
  onRegister,
  onClose,
}) {
  const [phase, setPhase] = useState('loading') // loading | preview | playing | submitting | result | error
  const [challenge, setChallenge] = useState(null)
  const [yourScore, setYourScore] = useState(null)
  const [xpGained, setXpGained] = useState(0)
  const [error, setError] = useState('')

  const isAuthenticated = Boolean(user)

  const fetchChallenge = useCallback(async () => {
    setPhase('loading')
    try {
      const data = isAuthenticated
        ? await authedFetch(`/api/challenges/${challengeId}/`)
        : await publicFetch(`/api/challenges/${challengeId}/`)
      setChallenge(data)
      setPhase('preview')
    } catch {
      setError('Challenge not found or has expired.')
      setPhase('error')
    }
  }, [challengeId, isAuthenticated, authedFetch])

  useEffect(() => {
    void fetchChallenge()
  }, [fetchChallenge])

  async function handleGameFinish(score) {
    setYourScore(score)

    if (!isAuthenticated) {
      setPhase('result')
      return
    }

    setPhase('submitting')
    try {
      const data = await authedFetch(`/api/challenges/${challengeId}/accept/`, {
        method: 'POST',
        body: JSON.stringify({ opponent_score: score }),
      })
      setChallenge(data.challenge)
      setXpGained(data.xp_gained || 0)
      setPhase('result')
    } catch {
      setPhase('result')
    }
  }

  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-3">
          <p className="text-3xl font-black tracking-[0.18em] text-white">ZYNEXON</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Loading challenge...</p>
        </div>
      </div>
    )
  }

  if (phase === 'error' || !challenge) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950 p-5">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-2xl font-black text-white">Challenge not found</p>
          <p className="text-sm font-semibold text-zinc-400">{error || 'This challenge may have expired or been deleted.'}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-bold text-zinc-300 hover:bg-zinc-800 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const challengerName = challenge.challenger?.name || 'A warrior'
  const gameLabel = challenge.game_type_label || challenge.game_type
  const gameIcon = GAME_ICONS[challenge.game_type] || '⚔️'

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#f8f6f1]">
      <div className="mx-auto max-w-[420px] px-5 pt-6 pb-24 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-900">ZYNEXON</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 px-3 py-1 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100"
          >
            ✕ Close
          </button>
        </div>

        {phase === 'preview' && (
          <>
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute right-4 top-2 text-[80px] leading-none opacity-[0.06] select-none">
                {gameIcon}
              </div>
              <div className="relative z-10">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-3">
                  You've been challenged ⚔️
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-xl font-black text-white">
                    {(challengerName[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-base font-black text-white">{challengerName}</p>
                    <p className="text-[10px] font-semibold text-zinc-500">
                      Level {challenge.challenger?.level || 1} • 🔥 {challenge.challenger?.streak || 0} streak
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Game</span>
                    <span className="text-sm font-black text-white">{gameIcon} {gameLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Their Score</span>
                    <span className="text-xl font-black text-white tabular-nums">{challenge.challenger_score}</span>
                  </div>
                  {challenge.xp_wager > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">XP Wager</span>
                      <span className="text-sm font-black text-amber-400">💰 {challenge.xp_wager} XP</span>
                    </div>
                  )}
                </div>

                {challenge.status === 'completed' && (
                  <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-center">
                    <p className="text-xs font-black text-zinc-400">Challenge completed</p>
                    {challenge.winner && (
                      <p className="text-xs font-semibold text-zinc-500 mt-0.5">
                        Winner: {challenge.winner === 'challenger' ? challengerName : challenge.opponent?.name || 'Opponent'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {challenge.status === 'open' && (
              <button
                type="button"
                onClick={() => setPhase('playing')}
                className="w-full rounded-2xl bg-zinc-950 px-4 py-4 text-sm font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 active:scale-[0.98]"
              >
                ⚔️ Accept the Challenge
              </button>
            )}

            {!isAuthenticated && (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-zinc-600">
                  You're playing as a guest. Create an account to save your score and challenge others.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onRegister}
                    className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-black text-white hover:bg-zinc-800"
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    onClick={onLogin}
                    className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                  >
                    Log In
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {phase === 'playing' && challenge.game_type === 'quick_math' && (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Beat {challengerName}'s score of {challenge.challenger_score}
              </p>
            </div>
            <QuickMathChallenge
              targetScore={challenge.challenger_score}
              challengerName={challengerName}
              onFinish={handleGameFinish}
            />
          </div>
        )}

        {phase === 'playing' && challenge.game_type !== 'quick_math' && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 text-center space-y-4">
            <p className="text-lg font-black text-zinc-950">{gameIcon} {gameLabel}</p>
            <p className="text-sm font-semibold text-zinc-600 leading-relaxed">
              To accept this challenge, play <strong>{gameLabel}</strong> and try to beat {challenge.challenger_score} points.
            </p>
            {isAuthenticated ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-black text-white"
                >
                  Go to Training Hub
                </button>
                <p className="text-[10px] font-semibold text-zinc-400">
                  Beat their score in {gameLabel} from the Training Hub.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onRegister}
                  className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-black text-white"
                >
                  Create Account to Play
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'submitting' && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 text-center">
            <p className="text-sm font-semibold text-zinc-600">Submitting result...</p>
          </div>
        )}

        {phase === 'result' && yourScore !== null && (
          <ChallengeResultScreen
            challenge={challenge}
            yourScore={yourScore}
            isAuthenticated={isAuthenticated}
            xpGained={xpGained}
            onLogin={onLogin}
            onRegister={onRegister}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

// -- My Challenges Dashboard --
export function MyChallengeDashboard({ authedFetch, onClose }) {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await authedFetch('/api/challenges/')
        setChallenges(data.challenges || [])
      } catch {
        // Keep silent; UI will show empty state.
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [authedFetch])

  async function handleCopy(challengeId) {
    await copyToClipboard(getShareUrl(challengeId))
    setCopied(challengeId)
    setTimeout(() => setCopied(null), 2000)
  }

  const open = challenges.filter((c) => c.status === 'open')
  const completed = challenges.filter((c) => c.status === 'completed')

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#f8f6f1]">
      <div className="mx-auto max-w-[420px] px-5 pt-6 pb-24 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">1v1 Wars</p>
            <h1 className="text-2xl font-black text-zinc-950">My Challenges</h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 px-3 py-1 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100"
          >
            ✕ Close
          </button>
        </div>

        {loading && (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-200" />
            ))}
          </div>
        )}

        {!loading && challenges.length === 0 && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center space-y-3">
            <p className="text-4xl">⚔️</p>
            <p className="text-base font-black text-zinc-900">No challenges yet</p>
            <p className="text-sm font-semibold text-zinc-500 leading-relaxed">
              After completing a game, use the "Challenge a Friend" button to send a 1v1 duel link.
            </p>
          </div>
        )}

        {open.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Open ({open.length})
            </p>
            {open.map((c) => (
              <div key={c.id} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{GAME_ICONS[c.game_type] || '⚔️'}</span>
                    <div>
                      <p className="text-sm font-black text-zinc-900">{c.game_type_label}</p>
                      <p className="text-[10px] font-semibold text-zinc-500">
                        Your score: {c.challenger_score}
                        {c.xp_wager > 0 && ` • 💰 ${c.xp_wager} XP wager`}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                    Open
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleCopy(c.id)
                    }}
                    className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-[10px] font-bold text-zinc-600 transition hover:bg-zinc-50 active:scale-95"
                  >
                    {copied === c.id ? '✓ Copied!' : '📤 Copy Link'}
                  </button>
                  <span className="self-center text-[9px] font-semibold text-zinc-400 shrink-0">
                    Expires {c.hours_remaining}h
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Completed ({completed.length})
            </p>
            {completed.map((c) => {
              const youWon = (c.is_challenger && c.winner === 'challenger')
                || (c.is_opponent && c.winner === 'opponent')
              const tied = c.winner === 'tie'
              return (
                <div key={c.id} className={`rounded-2xl border px-4 py-3.5 ${
                  youWon ? 'border-emerald-200 bg-emerald-50'
                    : tied ? 'border-zinc-200 bg-white'
                      : 'border-red-100 bg-red-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{GAME_ICONS[c.game_type] || '⚔️'}</span>
                      <div>
                        <p className="text-sm font-black text-zinc-900">{c.game_type_label}</p>
                        <p className="text-[10px] font-semibold text-zinc-500">
                          {c.is_challenger
                            ? `Your ${c.challenger_score} vs ${c.opponent?.name || 'Opponent'}'s ${c.opponent_score}`
                            : `${c.challenger?.name}'s ${c.challenger_score} vs your ${c.opponent_score}`}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-black ${
                      youWon ? 'text-emerald-600' : tied ? 'text-zinc-600' : 'text-red-600'
                    }`}>
                      {youWon ? '🏆 W' : tied ? '= TIE' : '💀 L'}
                    </span>
                  </div>
                  <p className="mt-1 text-[9px] font-semibold text-zinc-400">{timeAgo(c.completed_at)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
