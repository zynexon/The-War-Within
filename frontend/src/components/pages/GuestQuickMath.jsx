import { useEffect, useState } from 'react'

function generateGuestQuestion() {
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

function GuestScoreScreen({ score, onSignup, onPlayAgain }) {
  const verdict = score >= 15
    ? { label: 'Elite', msg: 'Top 5% of warriors. That is rare.' }
    : score >= 10
      ? { label: 'Strong', msg: 'Top 20%. You have the discipline.' }
      : score >= 5
        ? { label: 'Solid', msg: 'Keep training. The top is reachable.' }
        : { label: 'Civilian', msg: 'This is where every warrior starts.' }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col space-y-5 bg-[#f8f6f1] px-5 pb-6 pt-8">
      <div className="rounded-3xl border border-zinc-900 bg-zinc-900 p-6 text-center text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">Your result</p>
        <p className="mt-3 text-7xl font-black">{score}</p>
        <p className="mt-2 text-xl font-black text-zinc-200">{verdict.label}</p>
        <p className="mt-2 text-sm font-semibold text-zinc-400">{verdict.msg}</p>
      </div>

      <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white px-5 py-5">
        <div className="space-y-1 text-center">
          <p className="text-base font-black text-zinc-900">Save your score. Start ranking.</p>
          <p className="text-xs font-semibold text-zinc-500">
            Your progress disappears when you close this tab.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSignup('register')}
          className="w-full rounded-xl bg-zinc-900 px-4 py-3.5 text-sm font-black text-white transition hover:bg-zinc-800 active:scale-95"
        >
          Create Account - It is Free
        </button>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { val: '7', label: 'Brain Games' },
            { val: 'XP', label: 'Progression' },
            { val: '🏆', label: 'Leaderboard' },
          ].map(({ val, label }) => (
            <div key={label} className="rounded-xl border border-zinc-100 bg-zinc-50 py-2.5">
              <p className="text-sm font-black text-zinc-900">{val}</p>
              <p className="text-[10px] font-bold text-zinc-500">{label}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onPlayAgain}
          className="w-full rounded-lg py-2 text-xs font-semibold text-zinc-400 transition hover:text-zinc-700"
        >
          Play again without account
        </button>
      </div>
    </main>
  )
}

function GuestQuickMath({ onFinish, onPlayAgain }) {
  const [phase, setPhase] = useState('playing')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [question, setQuestion] = useState(generateGuestQuestion())
  const [answer, setAnswer] = useState('')

  useEffect(() => {
    if (phase !== 'playing') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(intervalId)
          setPhase('result')
          return 0
        }
        return previous - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [phase])

  function handleSubmit(event) {
    event.preventDefault()

    const parsed = Number.parseInt(answer, 10)
    if (!Number.isNaN(parsed) && parsed === question.answer) {
      setScore((previous) => previous + 1)
    }

    setAnswer('')
    setQuestion(generateGuestQuestion())
  }

  if (phase === 'result') {
    return (
      <GuestScoreScreen
        score={score}
        onSignup={(mode) => onFinish(mode, score)}
        onPlayAgain={onPlayAgain}
      />
    )
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col bg-[#f8f6f1] px-5 pb-6 pt-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 text-center shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Quick Math</p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-bold text-zinc-700">⏱ {timeLeft}s</p>
          <p className="text-sm font-bold text-zinc-700">Score: {score}</p>
        </div>

        <p className="mt-6 text-4xl font-black tracking-tight text-zinc-950">
          {question.num1} {question.operator} {question.num2}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="number"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            autoFocus
            className="w-full rounded-xl border border-zinc-300 px-3 py-3 text-center text-xl font-black outline-none focus:border-zinc-900"
            placeholder="?"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-black text-white"
          >
            Submit
          </button>
        </form>
      </div>
    </main>
  )
}

export default GuestQuickMath
