function LandingPage({ onTryGame, onLogin, onRegister, activeWarriorsCount }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col px-5 pt-5 pb-6">
      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 px-5 py-6 text-center text-white shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
        <div className="text-4xl font-black tracking-[0.18em] text-white">ZYNEXON</div>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">The War Within</p>
        <h1 className="mt-5 text-2xl font-bold text-white">Win your day.</h1>
        <p className="mt-2 text-zinc-300">Or watch yourself lose it.</p>
        <p className="mt-5 text-base font-semibold leading-relaxed text-zinc-200">
          Most people talk about discipline. You are about to practice it.
        </p>
        {activeWarriorsCount > 0 ? (
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
            {activeWarriorsCount} warriors active this week
          </p>
        ) : null}
      </section>

      <section className="mt-5 space-y-4 rounded-3xl border border-zinc-200 bg-white px-4 py-5 shadow-md">
        <div className="space-y-1 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">30 second challenge</p>
          <h2 className="text-xl font-black text-zinc-900">Test your mental speed</h2>
          <p className="text-sm text-zinc-500">No sign-up. Try it now.</p>
        </div>

        <button
          type="button"
          onClick={onTryGame}
          className="w-full rounded-xl bg-zinc-900 px-4 py-3.5 text-sm font-black text-white transition hover:bg-zinc-800 active:scale-95"
        >
          ⚡ Start Quick Math - 30 Seconds
        </button>

        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            { icon: '🧠', label: 'Brain training' },
            { icon: '⚔️', label: 'War Mode focus' },
            { icon: '🏆', label: 'XP + Rankings' },
          ].map(({ icon, label }) => (
            <div key={label} className="rounded-xl border border-zinc-100 bg-zinc-50 px-2 py-2.5 text-center">
              <p className="text-lg">{icon}</p>
              <p className="mt-1 text-[10px] font-bold text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onLogin}
          className="text-xs font-semibold text-zinc-500 underline underline-offset-2"
        >
          Already a warrior? Log in
        </button>
        <button
          type="button"
          onClick={onRegister}
          className="text-xs font-semibold text-zinc-500 underline underline-offset-2"
        >
          Create account
        </button>
      </div>
    </main>
  )
}

export default LandingPage
