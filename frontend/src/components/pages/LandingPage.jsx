// frontend/src/components/pages/LandingPage.jsx

function LandingPage({ onTryGame, onLogin, onRegister, activeWarriorsCount }) {
  return (
    <main className="w-full max-w-[420px] mx-auto pb-12">

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="min-h-[100dvh] flex flex-col px-5 pt-6 pb-8">

        {/* Nav */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-[0.28em] text-zinc-900">
            ZYNEXON
          </span>
          <button
            type="button"
            onClick={onLogin}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-[11px] font-bold text-zinc-600 transition hover:border-zinc-900 hover:text-zinc-900"
          >
            Log in
          </button>
        </div>

        {/* Hero card */}
        <div className="mt-6 flex-1 flex flex-col">
          <div className="rounded-[2rem] border border-zinc-900 bg-zinc-950 px-6 pt-8 pb-6 flex flex-col relative overflow-hidden">

            {/* Background texture — faint grid */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
                backgroundSize: '32px 32px',
              }}
            />

            <div className="relative z-10">
              {/* Eyebrow */}
              <div className="flex items-center gap-2 mb-5">
                <div className="h-px flex-1 bg-zinc-700" />
                <span className="text-[9px] font-black uppercase tracking-[0.32em] text-zinc-500">
                  The War Within
                </span>
                <div className="h-px flex-1 bg-zinc-700" />
              </div>

              {/* Headline */}
              <h1 className="text-[42px] font-black leading-[0.92] tracking-[-0.03em] text-white">
                STOP<br />
                LOSING<br />
                YOUR<br />
                DAYS.
              </h1>

              {/* Sub-headline */}
              <p className="mt-5 text-sm font-semibold leading-relaxed text-zinc-300">
                Zynexon is a daily discipline system — tasks, brain training, deep work timers, and a leaderboard — built for people who are tired of knowing what to do and still not doing it.
              </p>

              {/* Social proof pill */}
              {activeWarriorsCount > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                    {activeWarriorsCount.toLocaleString()} warriors active this week
                  </span>
                </div>
              )}

              {/* Primary CTA */}
              <button
                type="button"
                onClick={onTryGame}
                className="mt-6 w-full rounded-2xl bg-white px-4 py-4 text-sm font-black uppercase tracking-wider text-zinc-950 transition-all duration-200 hover:bg-zinc-100 active:scale-[0.98]"
              >
                ⚡ Test Your Mental Speed — 30 sec
              </button>

              <p className="mt-2.5 text-center text-[10px] font-semibold text-zinc-600">
                No signup needed. See your score instantly.
              </p>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">What you're getting into</p>
            <div className="flex flex-col gap-1 items-center">
              <div className="h-4 w-px bg-zinc-300" />
              <div className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            </div>
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM ──────────────────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="rounded-3xl border border-zinc-200 bg-white px-5 py-6">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400 mb-4">
            Sound familiar?
          </p>
          <div className="space-y-4">
            {[
              'You know what you should be doing every day. You just don\'t do it consistently.',
              'You make plans on Sunday night. By Wednesday they\'re gone.',
              'You open your phone to study. You close it 40 minutes later having done nothing.',
            ].map((line, i) => (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-[10px] font-black text-zinc-300">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-sm font-semibold leading-relaxed text-zinc-700">{line}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-zinc-100 pt-5">
            <p className="text-base font-black leading-snug text-zinc-900">
              Zynexon makes every day binary — you either won it or you lost it. No grey area. No excuses.
            </p>
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET ─────────────────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400">
            Your daily arsenal
          </p>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <div className="space-y-3">
          {[
            {
              icon: '📋',
              title: 'Daily Tasks',
              color: 'border-l-blue-500',
              desc: '5 discipline-focused tasks every day, tailored to your focus area — study, fitness, work, logic, or mental resilience. Miss them and your streak breaks.',
            },
            {
              icon: '🧠',
              title: 'Brain Training',
              color: 'border-l-purple-500',
              desc: '10 games that sharpen focus, working memory, reaction speed, and pattern recognition. 5 minutes a day compounds into a measurably sharper mind.',
            },
            {
              icon: '⚔️',
              title: 'War Mode',
              color: 'border-l-red-500',
              desc: 'Lock in for 25, 45, or 60 minutes of deep work. Phone down. Timer running. XP only lands if you actually show up — it runs on the honour system.',
            },
            {
              icon: '🏆',
              title: 'Leaderboard',
              color: 'border-l-amber-500',
              desc: 'See exactly where you rank against every other warrior this week. Weekly XP resets every Monday — the race restarts. Nobody coasts.',
            },
            {
              icon: '📖',
              title: 'Daily Journal',
              color: 'border-l-emerald-500',
              desc: 'Rate your mood and energy each day. Set one objective for tomorrow. The honesty compounds — patterns in your performance become visible over time.',
            },
          ].map(({ icon, title, color, desc }) => (
            <div
              key={title}
              className={`rounded-2xl border border-zinc-200 bg-white px-4 py-4 border-l-4 ${color}`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-xl leading-none">{icon}</span>
                <p className="text-sm font-black text-zinc-900">{title}</p>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-zinc-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── STREAK SYSTEM ────────────────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950 px-5 py-6 relative overflow-hidden">
          {/* Faint number watermark */}
          <div className="pointer-events-none absolute right-4 top-2 text-[96px] font-black leading-none text-white opacity-[0.04] select-none">
            🔥
          </div>

          <div className="relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-500 mb-1">
              The mechanic that changes everything
            </p>
            <h2 className="text-2xl font-black text-white leading-tight">
              The Streak.
            </h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">
              Every day you complete tasks, your streak grows. Skip one day — it resets to zero. That single rule creates a daily urgency that no notification can replicate.
            </p>

            {/* Streak visual */}
            <div className="mt-5 flex gap-1.5">
              {[true, true, true, true, true, true, false, false].map((active, i) => (
                <div
                  key={i}
                  className={`flex-1 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                    active
                      ? 'bg-white text-zinc-950 font-black'
                      : i === 6
                        ? 'border-2 border-dashed border-zinc-600 text-zinc-600 font-bold text-xs'
                        : 'bg-zinc-800'
                  }`}
                >
                  {active ? '🔥' : i === 6 ? 'today' : ''}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] font-semibold text-zinc-600">
              6-day streak — one task today keeps it alive
            </p>

            <div className="mt-5 space-y-2.5">
              {[
                { icon: '🛡️', text: 'Streak Shields protect you from one missed day — earn them by completing perfect weeks.' },
                { icon: '📊', text: 'Weekly War Report every Sunday — grade, XP breakdown, rank change, verdict.' },
                { icon: '⚡', text: 'Reach XP milestones to unlock new ranks. Level 30 = ZYNEXON. Less than 1% will get there.' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <span className="text-base leading-none shrink-0 mt-0.5">{icon}</span>
                  <p className="text-xs font-semibold leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── RANK LADDER PREVIEW ───────────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400">Rank progression</p>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold text-zinc-500 mb-3 leading-relaxed">
            30 ranks. Each one earned through XP. Every day you show up moves you forward.
          </p>

          <div className="space-y-1.5">
            {[
              { level: 1,  rank: 'Civilian',   dim: true },
              { level: 5,  rank: 'Private',    dim: true },
              { level: 10, rank: 'Captain',    dim: true },
              { level: 15, rank: 'Commander',  dim: false },
              { level: 20, rank: 'Legend',     dim: false },
              { level: 30, rank: 'ZYNEXON',    dim: false, special: true },
            ].map(({ level, rank, dim, special }) => (
              <div
                key={level}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  special
                    ? 'bg-zinc-950 border border-zinc-700'
                    : dim
                      ? 'bg-zinc-50'
                      : 'bg-zinc-100'
                }`}
              >
                <span className={`text-[10px] font-black w-10 ${special ? 'text-amber-400' : dim ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Lv.{level}
                </span>
                <span className={`text-xs font-black uppercase tracking-wider ${special ? 'text-amber-400' : dim ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {rank}
                </span>
                {special && <span className="ml-auto text-sm">🏴</span>}
              </div>
            ))}
          </div>

          <p className="mt-3 text-[10px] font-semibold text-zinc-400 text-center">
            + 24 more ranks between them
          </p>
        </div>
      </section>

      {/* ── SOCIAL PROOF / NUMBERS ───────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: activeWarriorsCount > 0 ? activeWarriorsCount.toLocaleString() : '—', label: 'Warriors\nThis Week' },
            { value: '10',   label: 'Brain\nGames' },
            { value: '30',   label: 'Levels\nto Climb' },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-2xl border border-zinc-200 bg-white px-3 py-4 text-center">
              <p className="text-2xl font-black text-zinc-950">{value}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400 whitespace-pre-line leading-tight">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400">Daily loop</p>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <div className="space-y-2">
          {[
            { step: '01', title: 'Choose your focus', body: 'Study, Fitness, Work, Discipline, or Logic. Your daily tasks are generated around it.' },
            { step: '02', title: 'Complete 5 tasks', body: 'Each task is specific and actionable. No vague goals. Either you did it or you didn\'t.' },
            { step: '03', title: 'Train your brain', body: 'Run through one or two games from the Training Hub. Each takes under 5 minutes.' },
            { step: '04', title: 'Log your day', body: 'Rate your mood and energy. Set tomorrow\'s objective. Takes 30 seconds.' },
            { step: '05', title: 'Protect your streak', body: 'Don\'t break it. If you do, shields can save you. Earn shields by completing perfect weeks.' },
          ].map(({ step, title, body }) => (
            <div key={step} className="flex gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
              <span className="text-[10px] font-black text-zinc-300 mt-0.5 shrink-0 w-4">{step}</span>
              <div>
                <p className="text-sm font-black text-zinc-900">{title}</p>
                <p className="mt-0.5 text-xs font-semibold leading-relaxed text-zinc-500">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── GAME DEMO HOOK ───────────────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="rounded-3xl border border-zinc-200 bg-white px-5 py-6 text-center space-y-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400 mb-2">
              One of 10 brain training games
            </p>
            <h3 className="text-xl font-black text-zinc-950">Quick Math</h3>
            <p className="mt-1.5 text-sm font-semibold text-zinc-500 leading-relaxed">
              Solve as many arithmetic problems as you can in 30 seconds. Free to try — no account needed.
            </p>
          </div>

          <div className="flex justify-center gap-4">
            {[
              { label: 'Questions', value: 'Unlimited' },
              { label: 'Time', value: '30 sec' },
              { label: 'XP', value: 'Up to 50' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-sm font-black text-zinc-900">{value}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onTryGame}
            className="w-full rounded-2xl bg-zinc-950 px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 active:scale-[0.98]"
          >
            Start the 30-Second Test
          </button>
          <p className="text-[10px] font-semibold text-zinc-400">
            After the game you'll see how your score compares and what's inside the full app.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section className="px-5">
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950 px-5 py-8 text-center relative overflow-hidden">
          {/* Background texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.32em] text-zinc-500">
              The war is daily
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-white">
              Are you in<br />or are you out?
            </h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
              Free to start. No credit card. Takes less than 60 seconds to create an account and get your first 5 tasks.
            </p>

            <button
              type="button"
              onClick={onRegister}
              className="mt-6 w-full rounded-2xl bg-white px-4 py-4 text-sm font-black uppercase tracking-wider text-zinc-950 transition hover:bg-zinc-100 active:scale-[0.98]"
            >
              Create Account — It's Free
            </button>

            <button
              type="button"
              onClick={onLogin}
              className="mt-3 w-full rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
            >
              Already a warrior? Log in
            </button>

            <p className="mt-5 text-[10px] font-semibold text-zinc-600">
              Join {activeWarriorsCount > 0 ? `${activeWarriorsCount.toLocaleString()} other warriors` : 'others'} who chose discipline over excuses.
            </p>
          </div>
        </div>
      </section>

    </main>
  )
}

export default LandingPage
