// frontend/src/components/pages/TasksPage.jsx
import { useMemo } from 'react'
import TaskCard, { getCategoryConfig } from '../TaskCard'

// ─── Progress Ring ────────────────────────────────────────────────────────────
function ProgressRing({ completed, total }) {
  const radius = 44
  const stroke = 6
  const normalRadius = radius - stroke / 2
  const circumference = 2 * Math.PI * normalRadius
  const pct = total > 0 ? completed / total : 0
  const dashOffset = circumference * (1 - pct)
  const isDone = completed === total && total > 0

  return (
    <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx="50" cy="50" r={normalRadius}
          fill="none"
          stroke="#e4e4e7"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx="50" cy="50" r={normalRadius}
          fill="none"
          stroke={isDone ? '#111827' : '#111827'}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isDone ? (
          <span className="text-2xl leading-none">🏆</span>
        ) : (
          <>
            <span className="text-xl font-black leading-none text-zinc-900">{completed}</span>
            <span className="text-[10px] font-bold text-zinc-400">of {total}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Morning countdown ────────────────────────────────────────────────────────
function getMorningCountdown() {
  const now = new Date()
  const hours = now.getHours()
  if (hours >= 10) return null  // window closed

  const target = new Date(now)
  target.setHours(10, 0, 0, 0)
  const diffMs = target - now
  const diffMins = Math.floor(diffMs / 60000)
  const h = Math.floor(diffMins / 60)
  const m = diffMins % 60

  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

// ─── XP earned today from tasks ───────────────────────────────────────────────
function getXpEarnedToday(tasks) {
  return tasks
    .filter(t => t.completed)
    .reduce((sum, t) => sum + (t.xp || 0), 0)
}

// ─── Completed day state ──────────────────────────────────────────────────────
function DayWonState({ streakDays, xpEarned, onChangeFocus }) {
  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6 text-center relative overflow-hidden">
        {/* Background decorative text */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04] select-none">
          <span className="text-[120px] font-black text-white leading-none">W</span>
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">Today</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-white">Day Won.</h2>
          <p className="mt-2 text-sm font-semibold text-zinc-400 leading-relaxed">
            All 5 tasks cleared. The streak lives.
          </p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-black text-white">+{xpEarned}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">XP Today</p>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="text-center">
              <p className="text-2xl font-black text-white">🔥 {streakDays}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Day Streak</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center shadow-sm">
        <p className="text-sm font-bold text-zinc-700">Come back tomorrow for new tasks.</p>
        <p className="mt-0.5 text-xs font-semibold text-zinc-400">Resets at midnight.</p>
      </div>

      {onChangeFocus && (
        <button
          type="button"
          onClick={onChangeFocus}
          className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50"
        >
          Change Tomorrow's Focus →
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
function TasksPage({
  onBack,
  onChangeFocus,
  focusCategory,
  focusOptions,
  completedCount,
  tasks,
  isLoading,
  onCompleteTask,
  justCompletedId,
  streakDays,
  dailyStatusMessage,
  errorText,
  // new optional props
  streakShields = 0,
  dailyChallenge = null,
}) {
  const currentFocus = focusOptions?.find(o => o.key === focusCategory) || null
  const isDayWon     = tasks.length > 0 && completedCount === tasks.length
  const xpEarned     = useMemo(() => getXpEarnedToday(tasks), [tasks])
  const morningLeft  = useMemo(() => getMorningCountdown(), [])

  // Sort: incomplete first (by xp desc), completed last
  const sortedTasks = useMemo(() => {
    const incomplete = [...tasks.filter(t => !t.completed)].sort((a, b) => b.xp - a.xp)
    const complete   = tasks.filter(t => t.completed)
    return [...incomplete, ...complete]
  }, [tasks])

  // Morning challenge: active if before 10am AND daily challenge is the morning type
  const showMorningBanner =
    morningLeft !== null &&
    dailyChallenge?.challenge?.type === 'complete_morning_task_before_10am' &&
    !dailyChallenge?.completed

  return (
    <>
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <section className="relative flex items-center pt-1">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
        >
          ← Back
        </button>
      </section>

      {/* ── Focus badge ────────────────────────────────────────────────── */}
      {currentFocus && (
        <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{currentFocus.icon}</span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Today's Focus</p>
                <p className="text-sm font-black text-zinc-900">{currentFocus.label}</p>
              </div>
            </div>
            {onChangeFocus && !isDayWon && (
              <button
                type="button"
                onClick={onChangeFocus}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[10px] font-bold text-zinc-500 transition hover:bg-zinc-100"
              >
                Change
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Morning bonus banner ───────────────────────────────────────── */}
      {showMorningBanner && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-black text-amber-900">
                ⚡ Morning bonus window
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-amber-700">
                Complete a task before 10 AM to finish today's challenge
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-base font-black text-amber-800">{morningLeft}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">remaining</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Day Won state ──────────────────────────────────────────────── */}
      {isDayWon ? (
        <DayWonState
          streakDays={streakDays}
          xpEarned={xpEarned}
          onChangeFocus={onChangeFocus}
        />
      ) : (
        <>
          {/* ── Progress header ──────────────────────────────────────── */}
          <section className="rounded-3xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-5">
              {/* Ring */}
              <ProgressRing completed={completedCount} total={tasks.length} />

              {/* Stats */}
              <div className="flex-1 space-y-3">
                {/* XP earned */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">XP from tasks today</p>
                  <p className="mt-0.5 text-2xl font-black text-zinc-900">
                    +{xpEarned}
                    <span className="ml-1.5 text-xs font-bold text-zinc-400">XP</span>
                  </p>
                </div>

                {/* Streak + shields */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🔥</span>
                    <span className="text-xs font-black text-zinc-700">{streakDays}d streak</span>
                  </div>
                  {streakShields > 0 && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: streakShields }).map((_, i) => (
                        <span key={i} className="text-xs">🛡️</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status message */}
                <p className="text-[11px] font-semibold text-zinc-500 leading-relaxed">
                  {dailyStatusMessage}
                </p>
              </div>
            </div>

            {/* Progress bar for remaining */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <span>Progress</span>
                <span>{completedCount}/{tasks.length} tasks</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-zinc-900 transition-all duration-700 ease-out"
                  style={{ width: tasks.length > 0 ? `${(completedCount / tasks.length) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </section>

          {/* ── Task list ────────────────────────────────────────────── */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Daily Tasks
              </h2>
              {/* Remaining XP potential */}
              {completedCount < tasks.length && (
                <span className="text-[10px] font-bold text-zinc-400">
                  {tasks.filter(t => !t.completed).reduce((s, t) => s + t.xp, 0)} XP remaining
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {sortedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={onCompleteTask}
                  isJustCompleted={task.id === justCompletedId}
                />
              ))}
              {isLoading && (
                <div className="space-y-2.5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-100" />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Streak at risk warning (after 9pm with incomplete tasks) ── */}
          {(() => {
            const hour = new Date().getHours()
            const remaining = tasks.length - completedCount
            if (hour >= 21 && remaining > 0 && tasks.length > 0) {
              return (
                <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs font-black text-red-800">
                    🔥 Streak at risk
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-red-700">
                    {remaining} task{remaining > 1 ? 's' : ''} left — complete at least one before midnight.
                  </p>
                </section>
              )
            }
            return null
          })()}
        </>
      )}

      {errorText && (
        <p className="text-center text-xs font-semibold text-red-600">{errorText}</p>
      )}
    </>
  )
}

export default TasksPage
