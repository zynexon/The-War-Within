import TaskCard from '../TaskCard'

function TasksPage({
  onBack,
  completedCount,
  tasks,
  isLoading,
  onCompleteTask,
  justCompletedId,
  streakDays,
  dailyStatusMessage,
  errorText,
}) {
  return (
    <>
      <section className="relative flex items-center pt-1">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
        >
          Back
        </button>
      </section>

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
              onComplete={onCompleteTask}
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
  )
}

export default TasksPage
