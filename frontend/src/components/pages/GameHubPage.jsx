const TRAINING_GAMES = [
  {
    id: 'quick_math',
    title: 'Mental Arithmetic',
    route: '/game/quick-math',
    desc: 'Solve as many as you can in 30 seconds.',
    difficulty: { icon: '⚡', label: 'Easy', color: 'text-emerald-600' },
    maxXp: 50,
    gameType: 'quick_math',
    category: 'speed_reaction',
    resultType: 'score',
    resultLabel: 'Quick Math',
  },
  {
    id: 'focus_tap',
    title: 'Focus Tap',
    route: '/game/focus-tap',
    desc: 'Tap the right color. Avoid distractions.',
    difficulty: { icon: '⚡', label: 'Easy', color: 'text-emerald-600' },
    maxXp: 50,
    gameType: 'focus_tap',
    category: 'speed_reaction',
    resultType: 'score',
    resultLabel: 'Focus Tap',
  },
  {
    id: 'number_recall',
    title: 'Number Recall',
    route: '/game/number-recall',
    desc: 'Memorize 7 digits. Reproduce perfectly.',
    difficulty: { icon: '🔥', label: 'Medium', color: 'text-amber-600' },
    maxXp: 50,
    gameType: 'number_recall',
    category: 'memory_pattern',
    resultType: 'binary',
    resultLabel: 'Number Recall',
  },
  {
    id: 'color_count_focus',
    title: 'Color Count',
    route: '/game/color-count-focus',
    desc: 'Count target color flashes across 8 rounds.',
    difficulty: { icon: '🔥', label: 'Medium', color: 'text-amber-600' },
    maxXp: 60,
    gameType: 'color_count_focus',
    category: 'memory_pattern',
    resultType: 'score',
    resultLabel: 'Color Count Focus',
  },
  {
    id: 'speed_pattern',
    title: 'Speed Pattern',
    route: '/game/speed-pattern',
    desc: 'Memorize 5x5 patterns across 3 rounds.',
    difficulty: { icon: '💀', label: 'Hard', color: 'text-rose-600' },
    maxXp: 100,
    gameType: 'speed_pattern',
    category: 'memory_pattern',
    resultType: 'binary',
    resultLabel: 'Speed Pattern',
  },
  {
    id: 'number_stack',
    title: 'Number Stack',
    route: '/game/number-stack',
    desc: 'Follow 3 rules and pick the final stack.',
    difficulty: { icon: '💀', label: 'Hard', color: 'text-rose-600' },
    maxXp: 75,
    gameType: 'number_stack',
    category: 'memory_pattern',
    resultType: 'binary',
    resultLabel: 'Number Stack',
  },
  {
    id: 'reverse_order',
    title: 'Reverse Order',
    route: '/game/reverse-order',
    desc: 'Apply ordered rules. Pick final sequence.',
    difficulty: { icon: '💀', label: 'Hard', color: 'text-rose-600' },
    maxXp: 75,
    gameType: 'reverse_order',
    category: 'logic_reasoning',
    resultType: 'binary',
    resultLabel: 'Reverse Order',
  },
]

const CATEGORY_SECTIONS = [
  { id: 'speed_reaction', label: 'Speed & Reaction' },
  { id: 'memory_pattern', label: 'Memory & Pattern' },
  { id: 'logic_reasoning', label: 'Logic & Reasoning' },
]

function displayRemainingXp(game, gameRemainingXpByType, lastTrainingResult) {
  const entry = gameRemainingXpByType?.[game.gameType]
  const mappedRemaining = Number(entry?.remaining_today)
  if (Number.isFinite(mappedRemaining)) {
    if (mappedRemaining <= 0) {
      return 'Cap reached today ✓'
    }
    return `Remaining today: ${Math.max(0, mappedRemaining)} XP`
  }

  if (lastTrainingResult && game.resultLabel === lastTrainingResult.label) {
    const remaining = Number(lastTrainingResult.remainingToday)
    if (Number.isFinite(remaining)) {
      if (remaining <= 0) {
        return 'Cap reached today ✓'
      }
      return `Remaining today: ${Math.max(0, remaining)} XP`
    }
  }

  return `Up to ${game.maxXp} XP today`
}

function GameCard({ game, onNavigate, lastTrainingResult, gameRemainingXpByType, isFeatured = false }) {
  return (
    <div
      className={`rounded-2xl border cursor-pointer ${isFeatured ? 'border-zinc-700 bg-zinc-950 text-white p-5' : 'border-zinc-200 bg-white p-4'}`}
      onClick={() => onNavigate(game.route)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onNavigate(game.route)
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className={`text-lg font-semibold ${isFeatured ? 'text-white' : 'text-zinc-900'}`}>{game.title}</h2>
        <span className={`text-xs font-black ${isFeatured ? 'text-zinc-200' : game.difficulty.color}`}>
          {game.difficulty.icon} {game.difficulty.label}
        </span>
      </div>
      <p className={`mt-1 text-sm ${isFeatured ? 'text-zinc-300' : 'text-zinc-500'}`}>{game.desc}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className={`text-xs font-bold uppercase tracking-widest ${isFeatured ? 'text-zinc-200' : 'text-zinc-500'}`}>
          Up to {game.maxXp} XP
        </p>
        <p className={`text-xs font-semibold ${isFeatured ? 'text-zinc-300' : 'text-zinc-600'}`}>
          {displayRemainingXp(game, gameRemainingXpByType, lastTrainingResult)}
        </p>
      </div>
      {isFeatured ? <p className="mt-3 text-sm font-black text-white">Train Now →</p> : null}
    </div>
  )
}

function GameHubPage({ onBack, onNavigate, dailyTrainingGameLabel, lastTrainingResult, gameRemainingXpByType }) {
  const featuredGame = TRAINING_GAMES.find((game) => game.resultLabel === dailyTrainingGameLabel) || TRAINING_GAMES[0]

  return (
    <section className="space-y-4">
      <div className="relative flex items-center pt-1">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
        >
          ← Back
        </button>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Training Hub</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-900">Sharpen the weapon.</h1>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Today's Training</p>
        <GameCard
          game={featuredGame}
          onNavigate={onNavigate}
          lastTrainingResult={lastTrainingResult}
          gameRemainingXpByType={gameRemainingXpByType}
          isFeatured
        />
      </div>

      {CATEGORY_SECTIONS.map((section) => {
        const games = TRAINING_GAMES.filter((game) => game.category === section.id && game.id !== featuredGame.id)
        if (games.length === 0) {
          return null
        }

        return (
          <div key={section.id} className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{section.label}</p>
            <div className="space-y-3">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onNavigate={onNavigate}
                  lastTrainingResult={lastTrainingResult}
                  gameRemainingXpByType={gameRemainingXpByType}
                />
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}

export default GameHubPage
