function GameHubPage({ onBack, onNavigate }) {
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

      <div
        className="p-4 rounded-2xl border mb-4 cursor-pointer"
        onClick={() => onNavigate('/game/quick-math')}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            onNavigate('/game/quick-math')
          }
        }}
      >
        <h2 className="text-lg font-semibold">Quick Math</h2>
        <p className="text-sm text-gray-500">
          Solve as many as you can in 30 seconds
        </p>
      </div>

      <div
        className="p-4 rounded-2xl border cursor-pointer"
        onClick={() => onNavigate('/game/focus-tap')}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            onNavigate('/game/focus-tap')
          }
        }}
      >
        <h2 className="text-lg font-semibold">Focus Tap</h2>
        <p className="text-sm text-gray-500">
          Tap the right color. Avoid distractions.
        </p>
      </div>

      <div
        className="p-4 rounded-2xl border cursor-pointer"
        onClick={() => onNavigate('/game/number-recall')}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            onNavigate('/game/number-recall')
          }
        }}
      >
        <h2 className="text-lg font-semibold">Number Recall</h2>
        <p className="text-sm text-gray-500">
          Memorize 7 digits. Reproduce perfectly.
        </p>
      </div>

      <div
        className="p-4 rounded-2xl border cursor-pointer"
        onClick={() => onNavigate('/game/color-count-focus')}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            onNavigate('/game/color-count-focus')
          }
        }}
      >
        <h2 className="text-lg font-semibold">Color Count Focus</h2>
        <p className="text-sm text-gray-500">
          Count target color flashes across 8 rounds.
        </p>
      </div>

      <div
        className="p-4 rounded-2xl border cursor-pointer"
        onClick={() => onNavigate('/game/speed-pattern')}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            onNavigate('/game/speed-pattern')
          }
        }}
      >
        <h2 className="text-lg font-semibold">Speed Pattern</h2>
        <p className="text-sm text-gray-500">
          Memorize 5x5 patterns across 3 rounds.
        </p>
      </div>
    </section>
  )
}

export default GameHubPage
