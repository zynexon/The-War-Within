import { useCallback, useEffect, useState } from 'react'
import confetti from 'canvas-confetti'

const DAILY_CAP = 75
const TOTAL_ROUNDS = 3
const MIN_VALUE = 0
const MAX_VALUE = 50
const MAX_RULE_ATTEMPTS = 80

function randomInt(max) {
  return Math.floor(Math.random() * max)
}

function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function sequenceKey(sequence) {
  return sequence.join('|')
}

function sequenceText(sequence) {
  return sequence.join(' - ')
}

function isSequenceInRange(sequence) {
  return sequence.every((value) => Number.isInteger(value) && value >= MIN_VALUE && value <= MAX_VALUE)
}

function sameSequence(a, b) {
  if (a.length !== b.length) {
    return false
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false
    }
  }

  return true
}

function generateBaseSequence() {
  return Array.from({ length: 4 }, () => randomInt(8) + 1)
}

function ordinalLabel(position) {
  if (position === 1) return '1st'
  if (position === 2) return '2nd'
  if (position === 3) return '3rd'
  return `${position}th`
}

function applyRule(sequence, rule) {
  if (rule.type === 'add_all') {
    return sequence.map((value) => value + rule.value)
  }

  if (rule.type === 'double_all') {
    return sequence.map((value) => value * 2)
  }

  if (rule.type === 'subtract_index') {
    return sequence.map((value, index) => (index === rule.index ? value - rule.value : value))
  }

  if (rule.type === 'swap_1_4') {
    const next = [...sequence]
    ;[next[0], next[3]] = [next[3], next[0]]
    return next
  }

  if (rule.type === 'rotate_left') {
    return [sequence[1], sequence[2], sequence[3], sequence[0]]
  }

  if (rule.type === 'reverse') {
    return [...sequence].reverse()
  }

  return sequence
}

function isValidOperation(sequence, rule) {
  const simulated = applyRule(sequence, rule)
  return isSequenceInRange(simulated)
}

function generateRandomRule(sequence) {
  const subtractIndex = randomInt(sequence.length)
  const maxSubtract = sequence[subtractIndex]

  const ruleFactories = [
    () => {
      const amount = randomInt(3) + 1
      return { type: 'add_all', value: amount, label: `Add ${amount} to every number.` }
    },
    () => ({ type: 'double_all', label: 'Multiply every number by 2.' }),
    () => {
      if (maxSubtract <= 0) {
        return null
      }
      const amount = randomInt(maxSubtract) + 1
      const labelIndex = ordinalLabel(subtractIndex + 1)
      return {
        type: 'subtract_index',
        index: subtractIndex,
        value: amount,
        label: `Subtract ${amount} from the ${labelIndex} number.`,
      }
    },
    () => ({ type: 'swap_1_4', label: 'Swap the 1st and 4th numbers.' }),
    () => ({ type: 'rotate_left', label: 'Rotate left by one position.' }),
    () => ({ type: 'reverse', label: 'Reverse the stack.' }),
  ]

  const factory = ruleFactories[randomInt(ruleFactories.length)]
  return factory()
}

function generateValidRule(sequence) {
  for (let attempt = 0; attempt < MAX_RULE_ATTEMPTS; attempt += 1) {
    const candidate = generateRandomRule(sequence)
    if (!candidate) {
      continue
    }
    if (isValidOperation(sequence, candidate)) {
      return candidate
    }
  }

  // Always-valid fallback: this only reorders values.
  return { type: 'reverse', label: 'Reverse the stack.' }
}

function buildRuleSet(startSequence) {
  const targetCount = 3
  const rules = []
  let current = [...startSequence]

  while (rules.length < targetCount) {
    const rule = generateValidRule(current)
    const next = applyRule(current, rule)
    if (!isSequenceInRange(next)) {
      continue
    }
    rules.push(rule)
    current = next
  }

  return rules
}

function applyRules(startSequence, rules) {
  return rules.reduce((current, rule) => applyRule(current, rule), [...startSequence])
}

function mutateSequence(sequence) {
  const style = randomInt(5)

  if (style === 0) {
    return applyRule(sequence, { type: 'reverse' })
  }

  if (style === 1) {
    const next = sequence.map((value, index) => value + (index === 0 ? 1 : 0))
    return isSequenceInRange(next) ? next : [...sequence].reverse()
  }

  if (style === 2) {
    return applyRule(sequence, { type: 'rotate_left' })
  }

  if (style === 3) {
    const next = [...sequence]
    ;[next[1], next[2]] = [next[2], next[1]]
    return next
  }

  const next = sequence.map((value, index) => value + (index === 3 ? 2 : 0))
  return isSequenceInRange(next) ? next : [sequence[1], sequence[2], sequence[3], sequence[0]]
}

function generateOptions(startSequence, rules, correctAnswer) {
  const optionMap = new Map()

  function addOption(sequence) {
    if (!sequence || sequence.length !== 4) {
      return
    }
    const key = sequenceKey(sequence)
    if (!optionMap.has(key)) {
      optionMap.set(key, sequence)
    }
  }

  addOption(correctAnswer)
  addOption(applyRules(startSequence, rules.slice(0, -1)))
  addOption(applyRules(startSequence, [...rules].reverse()))
  addOption(mutateSequence(correctAnswer))

  let attempts = 0
  while (optionMap.size < 4 && attempts < 20) {
    attempts += 1
    addOption(mutateSequence(correctAnswer))
  }

  while (optionMap.size < 4) {
    addOption(generateBaseSequence())
  }

  return shuffle(Array.from(optionMap.values()).slice(0, 4))
}

function buildPuzzle() {
  const startSequence = generateBaseSequence()
  const rules = buildRuleSet(startSequence)
  const correctAnswer = applyRules(startSequence, rules)
  const options = generateOptions(startSequence, rules, correctAnswer)

  return {
    startSequence,
    rules,
    correctAnswer,
    options,
  }
}

function awardXP(previousXpToday, resultMeta) {
  const gained = resultMeta?.xpAwarded || 0
  const before = Number.isFinite(resultMeta?.todayGameXpBefore)
    ? resultMeta.todayGameXpBefore
    : previousXpToday
  const updated = Math.min(DAILY_CAP, before + gained)
  const capReached = Boolean(resultMeta?.cappedByDailyLimit) || updated >= DAILY_CAP

  if (capReached) {
    return {
      xpEarnedToday: updated,
      message: 'Daily XP limit reached',
    }
  }

  return {
    xpEarnedToday: updated,
    message: gained > 0 ? 'Correct' : 'No XP awarded',
  }
}

function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    zIndex: 11000,
  })
}

function NumberStackGame({ onMainMenu, onGameStart, onGameFinished, submitting, resultMeta, errorText }) {
  const [startSequence, setStartSequence] = useState([])
  const [rules, setRules] = useState([])
  const [correctAnswer, setCorrectAnswer] = useState([])
  const [options, setOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)
  const [xpEarnedToday, setXpEarnedToday] = useState(0)
  const [feedbackType, setFeedbackType] = useState('idle')
  const [feedbackText, setFeedbackText] = useState('')
  const [loadingQuestion, setLoadingQuestion] = useState(true)
  const [currentRound, setCurrentRound] = useState(1)
  const [completionResult, setCompletionResult] = useState(null)

  const canChooseOption = !loadingQuestion && !submitting && feedbackType === 'idle' && !completionResult

  function loadPuzzle() {
    const puzzle = buildPuzzle()
    setStartSequence(puzzle.startSequence)
    setRules(puzzle.rules)
    setCorrectAnswer(puzzle.correctAnswer)
    setOptions(puzzle.options)
  }

  const startThreeRoundGame = useCallback(async () => {
    setLoadingQuestion(true)
    setSelectedOption(null)
    setFeedbackType('idle')
    setFeedbackText('')
    setCurrentRound(1)
    setCompletionResult(null)

    try {
      loadPuzzle()
      const started = onGameStart ? await onGameStart() : true
      if (!started) {
        setFeedbackType('incorrect')
        setFeedbackText('Could not start a new game. Try again.')
      }
    } catch {
      setFeedbackType('incorrect')
      setFeedbackText('Could not start a new game. Try again.')
    } finally {
      setLoadingQuestion(false)
    }
  }, [onGameStart])

  useEffect(() => {
    void startThreeRoundGame()
    // Intentionally run once on mount to avoid repeated restarts from parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSelectOption(option, index) {
    if (!canChooseOption) {
      return
    }

    setSelectedOption(index)
    const isCorrect = sameSequence(option, correctAnswer)

    if (!isCorrect) {
      setFeedbackType('incorrect')
      setFeedbackText('Wrong answer. New stack loaded for this round.')
      window.setTimeout(() => {
        setSelectedOption(null)
        setFeedbackType('idle')
        setFeedbackText('')
        loadPuzzle()
      }, 900)
      return
    }

    if (currentRound < TOTAL_ROUNDS) {
      setFeedbackType('correct')
      setFeedbackText('Correct')
      window.setTimeout(() => {
        setCurrentRound((previous) => previous + 1)
        setSelectedOption(null)
        setFeedbackType('idle')
        setFeedbackText('')
        loadPuzzle()
      }, 700)
      return
    }

    setFeedbackType('correct')
    setFeedbackText('Correct')

    const submitMeta = onGameFinished ? await onGameFinished({ score: 1 }) : null
    if (!submitMeta && onGameFinished) {
      setFeedbackType('incorrect')
      setFeedbackText('Could not submit result. Try again.')
      window.setTimeout(() => {
        setSelectedOption(null)
        setFeedbackType('idle')
        setFeedbackText('')
      }, 1000)
      return
    }

    const reward = awardXP(xpEarnedToday, submitMeta || resultMeta)
    setXpEarnedToday(reward.xpEarnedToday)
    setFeedbackText(
      reward.message === 'Daily XP limit reached'
        ? 'Correct. +15 XP. Daily XP limit reached'
        : 'Correct. +15 XP',
    )
    setCompletionResult({
      xpAwarded: submitMeta?.xpAwarded ?? resultMeta?.xpAwarded ?? 0,
      cappedByDailyLimit: Boolean(submitMeta?.cappedByDailyLimit ?? resultMeta?.cappedByDailyLimit),
      dailyCap: submitMeta?.dailyCap ?? resultMeta?.dailyCap,
      remainingToday: submitMeta?.remainingToday ?? resultMeta?.remainingToday,
    })
    fireConfetti()
  }

  function optionClass(index, option) {
    const isSelected = selectedOption === index
    const isCorrect = sameSequence(option, correctAnswer)

    if (feedbackType === 'correct' && isSelected) {
      return 'border-emerald-500 bg-emerald-50 text-emerald-700'
    }

    if (feedbackType === 'incorrect' && isCorrect) {
      return 'border-emerald-500 bg-emerald-50 text-emerald-700'
    }

    if (feedbackType === 'incorrect' && isSelected) {
      return 'border-red-500 bg-red-50 text-red-700'
    }

    if (isSelected) {
      return 'border-zinc-900 bg-zinc-900 text-white'
    }

    return 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400'
  }

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={onMainMenu}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
      >
        Back
      </button>

      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm text-center">
        <h2 className="text-2xl font-black tracking-tight text-zinc-950">Number Stack</h2>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500 whitespace-nowrap">
          Apply ordered rules. Pick final stack.
        </p>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
          Round {currentRound}/{TOTAL_ROUNDS}
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Start</p>
          <p className="mt-2 text-sm font-bold text-zinc-900 break-words">{sequenceText(startSequence)}</p>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Rules</p>
          <div className="mt-2 space-y-1.5">
            {rules.map((rule, index) => (
              <p key={`${rule.label}-${index}`} className="text-sm font-semibold text-zinc-700">
                {index + 1}. {rule.label}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Options</p>
        {options.map((option, index) => (
          <button
            key={`${sequenceKey(option)}-${index}`}
            type="button"
            onClick={() => handleSelectOption(option, index)}
            disabled={!canChooseOption}
            className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${optionClass(index, option)}`}
          >
            {sequenceText(option)}
          </button>
        ))}
      </div>

      {feedbackText ? (
        <p className={`text-sm font-bold ${feedbackType === 'correct' ? 'text-emerald-600' : 'text-red-600'}`}>
          {feedbackText}
        </p>
      ) : null}

      {loadingQuestion ? <p className="text-xs font-semibold text-zinc-500">Loading question...</p> : null}
      {submitting ? <p className="text-xs font-semibold text-zinc-500">Checking answer...</p> : null}
      {errorText ? <p className="text-xs font-semibold text-red-600">{errorText}</p> : null}

      {completionResult ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-5 shadow-xl text-center space-y-3">
            <h3 className="text-2xl font-black text-zinc-950">Round Complete</h3>
            <p className="text-sm font-semibold text-zinc-600">You cleared all 3 rounds.</p>
            <p className="text-sm font-semibold text-zinc-600">XP earned: +{completionResult.xpAwarded}</p>
            {completionResult.cappedByDailyLimit ? (
              <p className="text-xs font-semibold text-amber-600">
                Daily game cap reached ({completionResult.dailyCap} XP/day). Remaining today: {completionResult.remainingToday}
              </p>
            ) : null}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  void startThreeRoundGame()
                }}
                className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onMainMenu}
                className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-100"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default NumberStackGame
