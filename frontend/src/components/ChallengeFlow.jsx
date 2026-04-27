/**
 * ChallengeFlow.jsx  — ZYNEXON 1v1 Challenge System
 *
 * Two challenge modes, handled automatically by game type:
 *
 * SCORE_BASED  → quick_math only
 *   Challenger posts their score (e.g. 22 correct answers).
 *   Opponent plays the same 30-second game inline on the landing page.
 *   Higher number wins. Displayed as "22 vs 18".
 *
 * COMPLETION_BASED → all other games
 *   (focus_tap, number_recall, color_count_focus, speed_pattern,
 *    reverse_order, number_stack, pattern_sequence, logic_grid, reaction_tap)
 *   Challenger completed the game — score stored as 1.
 *   Opponent must also complete it within 48 hours.
 *   Opponent completes → they WIN the duel.
 *   Opponent fails / ignores → CHALLENGER wins by default.
 *   No score number shown — framing is "Can you complete it?"
 *
 * ─── Exports ────────────────────────────────────────────────────────────────
 *   ChallengeCreateButton    drop inside any game result screen
 *   ChallengeLandingPage     full-screen overlay triggered by ?challenge=<uuid>
 *   MyChallengeDashboard     full-screen modal listing sent / received duels
 *
 * ─── Minimal App.jsx wiring ──────────────────────────────────────────────────
 *
 * 1. Import:
 *      import { ChallengeLandingPage, ChallengeCreateButton, MyChallengeDashboard }
 *        from './components/ChallengeFlow'
 *
 * 2. State:
 *      const [activeChallengeId, setActiveChallengeId] = useState(null)
 *      const [showChallengeDashboard, setShowChallengeDashboard] = useState(false)
 *      // For completion challenges, track which challenge is pending acceptance:
 *      const pendingChallengeAcceptRef = useRef(null)
 *
 * 3. On load — detect ?challenge=<uuid>:
 *      useEffect(() => {
 *        const id = new URLSearchParams(window.location.search).get('challenge')
 *        if (id) setActiveChallengeId(id)
 *      }, [])
 *
 * 4. Render ChallengeLandingPage (before the main <main> block):
 *      {activeChallengeId && (
 *        <ChallengeLandingPage
 *          challengeId={activeChallengeId}
 *          user={user}
 *          authedFetch={authedFetch}
 *          onLogin={() => { setActiveChallengeId(null); setAuthMode('login') }}
 *          onRegister={() => { setActiveChallengeId(null); setAuthMode('register') }}
 *          onClose={() => {
 *            setActiveChallengeId(null)
 *            const url = new URL(window.location.href)
 *            url.searchParams.delete('challenge')
 *            window.history.replaceState({}, '', url.pathname)
 *          }}
 *          onNavigateToGame={(route, challengeId, onResultCallback) => {
 *            // Store the callback so the game can report back when it finishes
 *            pendingChallengeAcceptRef.current = { challengeId, onResultCallback }
 *            setActiveChallengeId(null)
 *            navigate(route)
 *          }}
 *        />
 *      )}
 *
 * 5. After each completion game finishes (in the existing finish handlers),
 *    check if there is a pending challenge and fire the callback:
 *
 *      // Example inside handleFocusTapFinish, after XP is set:
 *      if (pendingChallengeAcceptRef.current) {
 *        const { onResultCallback } = pendingChallengeAcceptRef.current
 *        pendingChallengeAcceptRef.current = null
 *        onResultCallback(result.outcome === 'won' ? 1 : 0)
 *      }
 *
 *    Do the same for every other completion game's finish handler.
 *    Score-based (quick_math) doesn't need this — it plays inline.
 *
 * 6. ChallengeCreateButton — drop after any game result:
 *      // score-based:
 *      <ChallengeCreateButton gameType="quick_math" score={gameResult.score} authedFetch={authedFetch} />
 *      // completion-based (score is always 1 = "I won"):
 *      <ChallengeCreateButton gameType="focus_tap" score={1} authedFetch={authedFetch} />
 *
 * 7. My Challenges dashboard:
 *      <button onClick={() => setShowChallengeDashboard(true)}>⚔️ My Challenges</button>
 *      {showChallengeDashboard && (
 *        <MyChallengeDashboard authedFetch={authedFetch} onClose={() => setShowChallengeDashboard(false)} />
 *      )}
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import confetti from 'canvas-confetti'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function apiUrl(path) {
  if (!API_BASE_URL) {
    return path
  }
  return `${API_BASE_URL}${path}`
}

// ─── Game metadata ────────────────────────────────────────────────────────────

const GAME_META = {
  quick_math: {
    label: 'Quick Math',
    icon: '⚡',
    mode: 'SCORE_BASED',
    challengeTagline: 'Beat my score',
    acceptTagline: 'Beat their score in 30 seconds',
    route: '/game/quick-math',
  },
  focus_tap: {
    label: 'Focus Tap',
    icon: '🎯',
    mode: 'COMPLETION',
    challengeTagline: 'I completed Focus Tap — can you?',
    acceptTagline: 'Complete all 15 rounds without tapping wrong',
    route: '/game/focus-tap',
  },
  number_recall: {
    label: 'Number Recall',
    icon: '🧠',
    mode: 'COMPLETION',
    challengeTagline: 'I completed Number Recall — can you?',
    acceptTagline: 'Memorise 7 digits across 3 rounds',
    route: '/game/number-recall',
  },
  color_count_focus: {
    label: 'Color Count',
    icon: '🎨',
    mode: 'COMPLETION',
    challengeTagline: 'I completed Color Count — can you?',
    acceptTagline: 'Count the right colors across 8 rounds',
    route: '/game/color-count-focus',
  },
  speed_pattern: {
    label: 'Speed Pattern',
    icon: '📐',
    mode: 'COMPLETION',
    challengeTagline: 'I completed Speed Pattern — can you?',
    acceptTagline: 'Replicate 3 grid patterns before time runs out',
    route: '/game/speed-pattern',
  },
  reverse_order: {
    label: 'Reverse Order',
    icon: '🔀',
    mode: 'COMPLETION',
    challengeTagline: 'I completed Reverse Order — can you?',
    acceptTagline: 'Apply 3 rules and pick the correct sequence',
    route: '/game/reverse-order',
  },
  number_stack: {
    label: 'Number Stack',
    icon: '🔢',
    mode: 'COMPLETION',
    challengeTagline: 'I completed Number Stack — can you?',
    acceptTagline: 'Follow 3 rules and pick the final number stack',
    route: '/game/number-stack',
  },
  pattern_sequence: {
    label: 'Pattern Sequence',
    icon: '🔮',
    mode: 'COMPLETION',
    challengeTagline: 'I completed Pattern Sequence — can you?',
    acceptTagline: 'Spot the rule and pick the 4th item, 9 rounds',
    route: '/game/pattern-sequence',
  },
  logic_grid: {
    label: 'Logic Grid',
    icon: '♟️',
    mode: 'COMPLETION',
    challengeTagline: 'I solved a Logic Grid — can you?',
    acceptTagline: 'Use clues to solve the logic matrix',
    route: '/game/logic-grid',
  },
  reaction_tap: {
    label: 'Reaction Tap',
    icon: '⚡',
    mode: 'COMPLETION',
    challengeTagline: 'I completed Reaction Tap — can you?',
    acceptTagline: 'Complete 5 reaction trials',
    route: '/game/reaction-tap',
  },
}

function getMeta(gameType) {
  return GAME_META[gameType] || {
    label: gameType,
    icon: '⚔️',
    mode: 'COMPLETION',
    challengeTagline: 'I completed this game — can you?',
    acceptTagline: 'Complete the game to win',
    route: '/game',
  }
}

function isScoreBased(gameType) {
  return getMeta(gameType).mode === 'SCORE_BASED'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const el = document.createElement('textarea')
  el.value = text
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
  return Promise.resolve()
}

function getShareUrl(challengeId) {
  return `${window.location.origin}/?challenge=${challengeId}`
}

function buildShareText(challenge) {
  const meta = getMeta(challenge.game_type)
  const name = challenge.challenger?.name || 'A warrior'
  if (meta.mode === 'SCORE_BASED') {
    return `${name} scored ${challenge.challenger_score} in ZYNEXON ${meta.label}. Can you beat it? ⚔️`
  }
  return `${name} just completed ZYNEXON ${meta.label}. Can you do the same? ⚔️`
}

function timeAgo(isoString) {
  if (!isoString) return ''
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fireWinConfetti() {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 11000 })
}

async function publicFetch(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || data?.detail || 'Request failed.')
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid API response.')
  }

  return data
}

// ─── Embedded Quick Math (only used for score-based challenges) ───────────────

function generateMathQuestion() {
  const n1 = Math.floor(Math.random() * 20) + 1
  const n2 = Math.floor(Math.random() * 20) + 1
  const ops = ['+', '-', '*']
  const op = ops[Math.floor(Math.random() * ops.length)]
  const answer = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2
  return { n1, n2, op, answer }
}

function QuickMathChallenge({ targetScore, challengerName, onFinish }) {
  const [timeLeft, setTimeLeft] = useState(30)
  const [score, setScore]       = useState(0)
  const [question, setQuestion] = useState(() => generateMathQuestion())
  const [answer, setAnswer]     = useState('')
  const [done, setDone]         = useState(false)
  const inputRef                = useRef(null)

  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(id); setDone(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  useEffect(() => { if (done) onFinish(score) }, [done]) // eslint-disable-line

  function handleSubmit(e) {
    e.preventDefault()
    const parsed = parseInt(answer, 10)
    if (!isNaN(parsed) && parsed === question.answer) setScore(s => s + 1)
    setAnswer('')
    setQuestion(generateMathQuestion())
    inputRef.current?.focus()
  }

  const pct   = (timeLeft / 30) * 100
  const ahead = score > targetScore
  const tied  = score === targetScore

  return (
    <div className="space-y-3">
      {/* Live scoreboard */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-center">
            <p className={`text-2xl font-black tabular-nums ${ahead ? 'text-emerald-400' : tied ? 'text-white' : 'text-red-400'}`}>
              {score}
            </p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">You</p>
          </div>
          <p className="text-zinc-600 font-black">vs</p>
          <div className="text-center">
            <p className="text-2xl font-black tabular-nums text-white">{targetScore}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 truncate max-w-[80px]">
              {challengerName}
            </p>
          </div>
        </div>
        {/* Timer bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeLeft <= 5 ? 'bg-red-500' : ahead ? 'bg-emerald-400' : 'bg-white'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={`mt-1 text-right text-[10px] font-black tabular-nums ${timeLeft <= 5 ? 'text-red-400' : 'text-zinc-600'}`}>
          {timeLeft}s
        </p>
      </div>

      {/* Question card */}
      <div className="rounded-3xl border border-zinc-200 bg-white px-5 py-7 text-center shadow-sm">
        <p className="text-4xl font-black tracking-tight text-zinc-950 tabular-nums">
          {question.n1}
          <span className="mx-3 text-zinc-400">{question.op === '*' ? '×' : question.op}</span>
          {question.n2}
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            autoFocus
            className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-xl font-black outline-none focus:border-zinc-900 tabular-nums transition"
            placeholder="?"
          />
          <button type="submit"
            className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black uppercase tracking-wider text-white active:scale-[0.98]">
            Submit
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Challenge Result Screen ───────────────────────────────────────────────────

function ChallengeResultScreen({ challenge, yourScore, isAuthenticated, xpGained, onLogin, onRegister, onClose }) {
  const meta           = getMeta(challenge.game_type)
  const challengerName = challenge.challenger?.name || 'Challenger'

  // Determine outcome labels based on game mode
  let won, resultHeading, resultBody

  if (meta.mode === 'SCORE_BASED') {
    won         = yourScore > challenge.challenger_score
    const tied  = yourScore === challenge.challenger_score
    resultHeading = won ? 'You Win ⚔️' : tied ? 'It\'s a Tie' : 'You Lose 💀'
    resultBody    = won
      ? `You beat ${challengerName} by ${yourScore - challenge.challenger_score}. Send them a rematch.`
      : tied
        ? `Dead even with ${challengerName}. Rematch to break the tie.`
        : `${challengerName} holds the record by ${challenge.challenger_score - yourScore}. Train harder.`
  } else {
    // Completion mode — yourScore 1 = completed, 0 = failed
    won           = yourScore === 1
    resultHeading = won ? 'Challenge Beaten! ✅' : 'Challenge Failed ❌'
    resultBody    = won
      ? `You matched ${challengerName} and proved you can do it.`
      : `${challengerName}'s record stands. Come back stronger.`
  }

  useEffect(() => { if (won) fireWinConfetti() }, [won])

  return (
    <div className="space-y-4">
      {/* Hero result card */}
      <div className={`rounded-3xl border p-6 text-center relative overflow-hidden ${
        won ? 'border-emerald-700 bg-emerald-950' : 'border-red-800 bg-red-950'
      }`}>
        <div className="pointer-events-none absolute right-3 top-0 text-[100px] font-black leading-none opacity-[0.06] select-none">
          {won ? '🏆' : '💀'}
        </div>
        <div className="relative z-10 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">
            {meta.icon} {meta.label} — 1v1 Duel
          </p>

          {/* Score display for score-based */}
          {meta.mode === 'SCORE_BASED' && (
            <div className="flex items-center justify-center gap-6 py-1">
              <div className="text-center">
                <p className="text-4xl font-black tabular-nums text-white">{yourScore}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">You</p>
              </div>
              <p className={`text-2xl font-black ${won ? 'text-emerald-400' : 'text-red-400'}`}>
                {yourScore > challenge.challenger_score ? '>' : yourScore === challenge.challenger_score ? '=' : '<'}
              </p>
              <div className="text-center">
                <p className="text-4xl font-black tabular-nums text-white">{challenge.challenger_score}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">{challengerName}</p>
              </div>
            </div>
          )}

          {/* Completion badge for completion-based */}
          {meta.mode === 'COMPLETION' && (
            <div className="py-2">
              <p className="text-5xl">{won ? '✅' : '❌'}</p>
            </div>
          )}

          <p className={`text-xl font-black ${won ? 'text-emerald-400' : 'text-red-400'}`}>
            {resultHeading}
          </p>
          <p className="text-xs font-semibold text-zinc-400 leading-relaxed">{resultBody}</p>

          {xpGained > 0 && (
            <div className="rounded-xl border border-amber-700 bg-amber-950/50 px-4 py-2">
              <p className="text-sm font-black text-amber-400">+{xpGained} XP stolen 💰</p>
            </div>
          )}
        </div>
      </div>

      {/* Guest signup gate */}
      {!isAuthenticated && (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 space-y-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400 mb-1">
              Your result vanishes when you close this tab
            </p>
            <h3 className="text-lg font-black text-zinc-950 leading-tight">
              Create a free account to save it, track your record, and send your own challenges.
            </h3>
          </div>
          <button type="button" onClick={onRegister}
            className="w-full rounded-2xl bg-zinc-950 px-4 py-4 text-sm font-black uppercase tracking-wider text-white active:scale-[0.98]">
            Create Account — Free
          </button>
          <button type="button" onClick={onLogin}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-600">
            Already have an account? Log in
          </button>
        </div>
      )}

      {isAuthenticated && (
        <button type="button" onClick={onClose}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-300 transition hover:bg-zinc-800">
          Back to Home
        </button>
      )}
    </div>
  )
}

// ─── ChallengeCreateButton ─────────────────────────────────────────────────────
// Drop inside any game result screen.
// score-based games  → pass the actual score number
// completion games   → always pass score={1}  (means "I won / completed")

export function ChallengeCreateButton({ gameType, score, authedFetch, className = '' }) {
  const [phase, setPhase]         = useState('idle') // idle | wager | creating | created | error
  const [wager, setWager]         = useState(0)
  const [challenge, setChallenge] = useState(null)
  const [copied, setCopied]       = useState(false)
  const [error, setError]         = useState('')

  const meta        = getMeta(gameType)
  const scoreMode   = meta.mode === 'SCORE_BASED'

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
    } catch (err) {
      setError(err.message || 'Could not create challenge.')
      setPhase('error')
    }
  }

  async function handleShare() {
    if (!challenge) return
    const url  = getShareUrl(challenge.id)
    const text = buildShareText(challenge)
    if (navigator.share) {
      navigator.share({ title: 'ZYNEXON Challenge ⚔️', text, url }).catch(() => doCopy())
    } else {
      doCopy()
    }
  }

  async function doCopy() {
    if (!challenge) return
    await copyToClipboard(getShareUrl(challenge.id))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ── Created ── */
  if (phase === 'created' && challenge) {
    return (
      <div className={`rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 ${className}`}>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Challenge created ⚔️
            </p>
            <p className="text-sm font-black text-white">
              {scoreMode
                ? `You scored ${score}. Can they beat it?`
                : `You completed ${meta.label}. Can they?`}
            </p>
          </div>
        </div>

        {challenge.xp_wager > 0 && (
          <div className="rounded-xl border border-amber-800 bg-amber-950/40 px-3 py-2 text-center">
            <p className="text-xs font-black text-amber-400">💰 {challenge.xp_wager} XP on the line</p>
            <p className="text-[10px] font-semibold text-amber-700">Winner takes all</p>
          </div>
        )}

        <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2">
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Share link</p>
          <p className="text-[10px] font-mono text-zinc-300 break-all leading-relaxed">
            {getShareUrl(challenge.id)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={handleShare}
            className="rounded-xl bg-white px-3 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-950 hover:bg-zinc-100 active:scale-95 transition">
            {copied ? '✓ Copied!' : '📤 Share Link'}
          </button>
          <button type="button" onClick={() => setPhase('idle')}
            className="rounded-xl border border-zinc-700 px-3 py-2.5 text-xs font-bold text-zinc-400 hover:bg-zinc-800 transition">
            Done
          </button>
        </div>

        <p className="text-center text-[9px] font-semibold text-zinc-600">
          Expires in {challenge.hours_remaining}h
        </p>
      </div>
    )
  }

  /* ── Wager picker ── */
  if (phase === 'wager') {
    return (
      <div className={`rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 ${className}`}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-0.5">
            {meta.icon} {meta.label} Challenge
          </p>
          <p className="text-sm font-black text-white">
            {scoreMode
              ? `Your score: ${score}. Set a wager.`
              : `You completed it. Dare a friend.`}
          </p>
        </div>

        <p className="text-xs font-semibold text-zinc-400 leading-relaxed">
          Wager XP — loser transfers it to the winner on completion.
        </p>

        <div className="flex gap-2 flex-wrap">
          {[0, 10, 25, 50, 100].map(amt => (
            <button key={amt} type="button" onClick={() => setWager(amt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                wager === amt
                  ? 'border-white bg-white text-zinc-950'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}>
              {amt === 0 ? 'No wager' : `${amt} XP`}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={handleCreate}
            className="rounded-xl bg-white px-3 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-950 hover:bg-zinc-100 active:scale-95 transition">
            ⚔️ Create Challenge
          </button>
          <button type="button" onClick={() => setPhase('idle')}
            className="rounded-xl border border-zinc-700 px-3 py-2.5 text-xs font-bold text-zinc-400 hover:bg-zinc-800 transition">
            Cancel
          </button>
        </div>

        {error && <p className="text-[10px] font-semibold text-red-400">{error}</p>}
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

  /* ── Idle (initial button) ── */
  return (
    <button type="button" onClick={() => setPhase('wager')}
      className={`w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-left transition hover:border-zinc-500 active:scale-[0.98] ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Challenge a friend
          </p>
          <p className="text-sm font-black text-white">
            ⚔️ {scoreMode ? `1v1 Duel — Score: ${score}` : `Dare them to complete ${meta.label}`}
          </p>
        </div>
        <span className="text-2xl shrink-0">{meta.icon}</span>
      </div>
      {error && <p className="mt-1 text-[10px] font-semibold text-red-400">{error}</p>}
    </button>
  )
}

// ─── ChallengeLandingPage ──────────────────────────────────────────────────────
// Shown as a full-screen overlay when ?challenge=<uuid> is in the URL.

export function ChallengeLandingPage({
  challengeId,
  user,
  authedFetch,
  onLogin,
  onRegister,
  onClose,
  onNavigateToGame,  // (route, challengeId, onResultCallback) => void
}) {
  const [phase, setPhase]         = useState('loading')
  const [challenge, setChallenge] = useState(null)
  const [yourScore, setYourScore] = useState(null)
  const [xpGained, setXpGained]  = useState(0)
  const [error, setError]         = useState('')
  const normalizedChallengeId = String(challengeId || '').trim().replace(/\/+$/, '')

  const isAuthenticated = Boolean(user)

  const fetchChallenge = useCallback(async () => {
    setPhase('loading')
    try {
      if (!normalizedChallengeId) {
        throw new Error('Invalid challenge id')
      }
      const data = await publicFetch(`/api/challenges/${encodeURIComponent(normalizedChallengeId)}/`)
      setChallenge(data)
      setPhase('preview')
    } catch {
      setError('This challenge link is invalid or has expired.')
      setPhase('error')
    }
  }, [normalizedChallengeId])

  useEffect(() => { fetchChallenge() }, [fetchChallenge])

  /* Submit result to backend after playing */
  async function submitResult(score) {
    if (!isAuthenticated) {
      setYourScore(score)
      setPhase('result')
      return
    }
    setPhase('submitting')
    try {
      const data = await authedFetch(`/api/challenges/${encodeURIComponent(normalizedChallengeId)}/accept/`, {
        method: 'POST',
        body: JSON.stringify({ opponent_score: score }),
      })
      setChallenge(data.challenge)
      setXpGained(data.xp_gained || 0)
    } catch { /* show result anyway */ }
    setYourScore(score)
    setPhase('result')
  }

  // Called by embedded QuickMath for score-based challenges
  function handleScoreFinish(score) { submitResult(score) }

  // Called by App.jsx via onNavigateToGame callback when a completion game ends
  function handleCompletionFinish(wonAsInt) { submitResult(wonAsInt) }

  /* ── Loading ── */
  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-3">
          <p className="text-3xl font-black tracking-[0.18em] text-white">ZYNEXON</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Loading challenge...
          </p>
        </div>
      </div>
    )
  }

  /* ── Error ── */
  if (phase === 'error' || !challenge) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950 p-5">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-2xl font-black text-white">Challenge not found</p>
          <p className="text-sm font-semibold text-zinc-400 leading-relaxed">
            {error || 'This challenge may have expired or been deleted.'}
          </p>
          <button type="button" onClick={onClose}
            className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-bold text-zinc-300 hover:bg-zinc-800 transition">
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const meta           = getMeta(challenge.game_type)
  const challengerName = challenge.challenger?.name || 'A warrior'
  const scoreMode      = meta.mode === 'SCORE_BASED'
  const isOpen         = challenge.status === 'open'
  const isCompleted    = challenge.status === 'completed'
  const isExpired      = challenge.status === 'expired'

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#f8f6f1]">
      <div className="mx-auto max-w-[420px] px-5 pt-6 pb-24 space-y-5">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-900">ZYNEXON</p>
          <button type="button" onClick={onClose}
            className="rounded-full border border-zinc-200 px-3 py-1 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100">
            ✕ Close
          </button>
        </div>

        {/* ── PREVIEW ── */}
        {phase === 'preview' && (
          <>
            {/* Challenge card */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute right-3 top-1 text-[80px] leading-none opacity-[0.06] select-none">
                {meta.icon}
              </div>
              <div className="relative z-10 space-y-4">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">
                  You've been challenged ⚔️
                </p>

                {/* Challenger identity */}
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-xl font-black text-white">
                    {(challengerName[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-base font-black text-white">{challengerName}</p>
                    <p className="text-[10px] font-semibold text-zinc-500">
                      Level {challenge.challenger?.level || 1} · 🔥 {challenge.challenger?.streak || 0} streak
                    </p>
                  </div>
                </div>

                {/* Details grid */}
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Game</span>
                    <span className="text-sm font-black text-white">{meta.icon} {meta.label}</span>
                  </div>

                  {scoreMode ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        Score to beat
                      </span>
                      <span className="text-2xl font-black text-white tabular-nums">
                        {challenge.challenger_score}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        Their status
                      </span>
                      <span className="text-sm font-black text-emerald-400">✅ Completed</span>
                    </div>
                  )}

                  {challenge.xp_wager > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        XP wager
                      </span>
                      <span className="text-sm font-black text-amber-400">💰 {challenge.xp_wager} XP</span>
                    </div>
                  )}
                </div>

                {/* What you need to do */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-center">
                  <p className="text-xs font-semibold text-zinc-400 leading-relaxed">
                    {meta.acceptTagline}
                  </p>
                </div>

                {/* Already done / expired notice */}
                {(isCompleted || isExpired) && (
                  <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-center">
                    <p className="text-xs font-black text-zinc-400">
                      {isCompleted ? 'This challenge has already been completed.' : 'This challenge has expired.'}
                    </p>
                    {isCompleted && challenge.winner && (
                      <p className="text-[10px] font-semibold text-zinc-600 mt-0.5">
                        Winner: {
                          challenge.winner === 'challenger'
                            ? challengerName
                            : challenge.opponent?.name || 'Opponent'
                        }
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons — only when challenge is open */}
            {isOpen && (
              <>
                {/* Score-based: play inline */}
                {scoreMode && (
                  <>
                    <button type="button" onClick={() => setPhase('playing')}
                      className="w-full rounded-2xl bg-zinc-950 px-4 py-4 text-sm font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 active:scale-[0.98]">
                      ⚔️ Accept — Play Now
                    </button>

                    {/* Guest note */}
                    {!isAuthenticated && (
                      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 space-y-2">
                        <p className="text-xs font-semibold text-zinc-600">
                          Playing as guest. Your result won't be saved.
                          Create an account to submit your score and challenge others.
                        </p>
                        <div className="flex gap-2">
                          <button type="button" onClick={onRegister}
                            className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-black text-white">
                            Sign Up
                          </button>
                          <button type="button" onClick={onLogin}
                            className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600">
                            Log In
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Completion-based: deep link to the real game */}
                {!scoreMode && isAuthenticated && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToGame) {
                          onNavigateToGame(meta.route, challengeId, handleCompletionFinish)
                        }
                      }}
                      className="w-full rounded-2xl bg-zinc-950 px-4 py-4 text-sm font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 active:scale-[0.98]">
                      ⚔️ Accept — Play {meta.label}
                    </button>
                    <p className="text-center text-[10px] font-semibold text-zinc-500">
                      Complete the game to win the duel.
                      {challenge.xp_wager > 0 ? ` Win = +${challenge.xp_wager} XP.` : ''}
                    </p>
                  </div>
                )}

                {/* Completion-based: guest must sign up first */}
                {!scoreMode && !isAuthenticated && (
                  <div className="rounded-3xl border border-zinc-200 bg-white p-5 space-y-3">
                    <p className="text-sm font-black text-zinc-950 leading-snug">
                      Create a free account to accept this challenge and play {meta.label}.
                    </p>
                    <button type="button" onClick={onRegister}
                      className="w-full rounded-2xl bg-zinc-950 px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white active:scale-[0.98]">
                      Sign Up & Accept
                    </button>
                    <button type="button" onClick={onLogin}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-600">
                      Already have an account? Log in
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── PLAYING — score-based inline ── */}
        {phase === 'playing' && scoreMode && (
          <div className="space-y-3">
            <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Beat {challengerName}'s score of {challenge.challenger_score}
            </p>
            <QuickMathChallenge
              targetScore={challenge.challenger_score}
              challengerName={challengerName}
              onFinish={handleScoreFinish}
            />
          </div>
        )}

        {/* ── SUBMITTING ── */}
        {phase === 'submitting' && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-zinc-600">Submitting your result...</p>
          </div>
        )}

        {/* ── RESULT ── */}
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

// ─── MyChallengeDashboard ──────────────────────────────────────────────────────

export function MyChallengeDashboard({ authedFetch, onClose }) {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading]       = useState(true)
  const [copied, setCopied]         = useState(null)

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior

    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior
      document.documentElement.style.overflow = previousHtmlOverflow
      document.documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior
    }
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await authedFetch('/api/challenges/')
        setChallenges(data.challenges || [])
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [authedFetch])

  async function handleCopy(id) {
    await copyToClipboard(getShareUrl(id))
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const open      = challenges.filter(c => c.status === 'open')
  const completed = challenges.filter(c => c.status === 'completed')
  const expired   = challenges.filter(c => c.status === 'expired')

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] h-[100svh] overflow-y-auto overscroll-contain bg-[#f8f6f1]"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div
        className="mx-auto min-h-full w-full max-w-[420px] px-5 pt-6 pb-28 space-y-5"
        style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
      >

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">1v1 Wars</p>
            <h1 className="text-2xl font-black text-zinc-950">My Challenges</h1>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-full border border-zinc-200 px-3 py-1 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100">
            ✕ Close
          </button>
        </div>

        {loading && (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-200" />)}
          </div>
        )}

        {!loading && challenges.length === 0 && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center space-y-3">
            <p className="text-4xl">⚔️</p>
            <p className="text-base font-black text-zinc-900">No challenges yet</p>
            <p className="text-sm font-semibold text-zinc-500 leading-relaxed">
              Finish any game and tap "Challenge a Friend" to start a 1v1 duel.
            </p>
          </div>
        )}

        {/* Open */}
        {open.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Awaiting Response ({open.length})
            </p>
            {open.map(c => {
              const meta = getMeta(c.game_type)
              return (
                <div key={c.id} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{meta.icon}</span>
                      <div>
                        <p className="text-sm font-black text-zinc-900">{meta.label}</p>
                        <p className="text-[10px] font-semibold text-zinc-500">
                          {meta.mode === 'SCORE_BASED'
                            ? `Score to beat: ${c.challenger_score}`
                            : 'Completion challenge'}
                          {c.xp_wager > 0 ? ` · 💰 ${c.xp_wager} XP` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 shrink-0">
                      Open
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleCopy(c.id)}
                      className="flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-[10px] font-bold text-zinc-600 hover:bg-zinc-50 active:scale-95 transition">
                      {copied === c.id ? '✓ Copied!' : '📤 Resend Link'}
                    </button>
                    <span className="text-[9px] font-semibold text-zinc-400 shrink-0">
                      {c.hours_remaining}h left
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Completed ({completed.length})
            </p>
            {completed.map(c => {
              const meta   = getMeta(c.game_type)
              const youWon = (c.is_challenger && c.winner === 'challenger') ||
                             (c.is_opponent   && c.winner === 'opponent')
              const tied   = c.winner === 'tie'

              // Human-readable result line
              let resultLine
              if (meta.mode === 'SCORE_BASED') {
                const yourS     = c.is_challenger ? c.challenger_score : c.opponent_score
                const theirS    = c.is_challenger ? c.opponent_score   : c.challenger_score
                const theirName = c.is_challenger
                  ? (c.opponent?.name || 'Opponent')
                  : (c.challenger?.name || 'Challenger')
                resultLine = `${yourS} vs ${theirS} (${theirName})`
              } else {
                const theirName = c.is_challenger
                  ? (c.opponent?.name || 'Opponent')
                  : (c.challenger?.name || 'Challenger')
                if (c.is_challenger) {
                  resultLine = youWon
                    ? `${theirName} couldn't complete it`
                    : `${theirName} completed it`
                } else {
                  resultLine = youWon ? 'You completed it ✅' : 'You failed to complete it'
                }
              }

              return (
                <div key={c.id} className={`rounded-2xl border px-4 py-3.5 ${
                  youWon ? 'border-emerald-200 bg-emerald-50' :
                  tied   ? 'border-zinc-200   bg-white'       :
                           'border-red-100    bg-red-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{meta.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-zinc-900 truncate">{meta.label}</p>
                        <p className="text-[10px] font-semibold text-zinc-500 truncate">{resultLine}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-black shrink-0 ml-2 ${
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

        {/* Expired */}
        {expired.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Expired ({expired.length})
            </p>
            {expired.map(c => {
              const meta = getMeta(c.game_type)
              return (
                <div key={c.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 opacity-60">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg grayscale">{meta.icon}</span>
                    <div>
                      <p className="text-sm font-black text-zinc-500">{meta.label}</p>
                      <p className="text-[10px] font-semibold text-zinc-400">
                        No response · {timeAgo(c.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div aria-hidden="true" className="h-8" />

      </div>
    </div>,
    document.body,
  )
}
