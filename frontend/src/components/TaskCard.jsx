function TaskCard({ task, onComplete, isJustCompleted }) {
  return (
    <article
      className={`group relative rounded-2xl border p-4 transition-all duration-300 ${
        task.completed
          ? 'border-zinc-200 bg-zinc-50/50 opacity-60'
          : 'border-zinc-300 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)] active:scale-[0.98]'
      }`}
    >
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3.5">
          {task.completed ? (
            <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-[14px] w-[14px]">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.815a.75.75 0 011.05-.145z" clipRule="evenodd" />
              </svg>
            </div>
          ) : (
            <div className="h-[22px] w-[22px] shrink-0 rounded-full border-2 border-zinc-200 transition-colors group-hover:border-zinc-300" />
          )}

          <div>
            <h3
              className={`text-[15px] font-bold transition-all ${
                task.completed ? 'text-zinc-500 line-through' : 'text-zinc-900'
              }`}
            >
              {task.name}
            </h3>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              +{task.xp} XP
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onComplete(task)}
          disabled={task.completed}
          className="shrink-0 rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-bold text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white disabled:pointer-events-none disabled:bg-transparent disabled:text-transparent"
        >
          {task.completed ? '' : 'Complete'}
        </button>
      </div>

      {isJustCompleted && (
        <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 z-20 animate-float-up text-lg font-black text-zinc-900 drop-shadow-md">
          +{task.xp} XP
        </div>
      )}
    </article>
  )
}

export default TaskCard
