function AuthPage({
  authMode,
  setAuthMode,
  handleAuthSubmit,
  authLoading,
  nameInput,
  setNameInput,
  emailInput,
  setEmailInput,
  passwordInput,
  setPasswordInput,
  errorText,
  activeWarriorsCount,
}) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col px-5 pt-5 pb-6">
      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 px-5 py-6 text-center text-white shadow-[0_18px_40px_rgba(0,0,0,0.35)] animate-[fadeIn_0.6s_ease]">
        <div className="text-4xl font-black tracking-[0.18em] text-white">ZYNEXON</div>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">The War Within</p>

        <h1 className="mt-5 text-2xl font-bold text-white">Win your day.</h1>
        <p className="mt-2 text-zinc-300">Or watch yourself lose it.</p>

        <p className="mt-5 text-base font-semibold leading-relaxed text-zinc-200">
          Most people talk about discipline. You're about to practice it.
        </p>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
          {activeWarriorsCount ? `${activeWarriorsCount} warriors active this week` : 'Warriors active this week'}
        </p>
      </section>

      <section className="mt-5 rounded-3xl border border-zinc-200 bg-white px-4 py-5 shadow-md transition-transform duration-200 hover:scale-[1.01] animate-[fadeIn_0.6s_ease]">
        <div className="mb-4 grid grid-cols-2 rounded-2xl border border-zinc-200 bg-zinc-100 p-1 text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            className={`rounded-xl px-3 py-2 transition ${authMode === 'login' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
            onClick={() => setAuthMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-2 transition ${authMode === 'register' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
            onClick={() => setAuthMode('register')}
          >
            Register
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleAuthSubmit}>
          {authMode === 'register' ? (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Name</label>
              <input
                type="text"
                required
                maxLength={30}
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="Name"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Email</label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={authLoading}
            className="w-full rounded-xl bg-gradient-to-r from-black to-gray-800 px-4 py-3 text-sm font-bold text-white mt-4 active:scale-95 transition disabled:opacity-60"
          >
            {authLoading ? 'Please wait...' : authMode === 'register' ? 'Create Account' : 'Start Winning'}
          </button>
          {authMode === 'login' ? (
            <>
              <p className="text-xs text-gray-400 text-center mt-3">Takes less than 10 seconds.</p>
              <p className="text-xs text-center mt-2 text-gray-500">Join others who chose discipline.</p>
            </>
          ) : null}
        </form>

        {errorText ? <p className="mt-3 text-xs font-semibold text-red-600">{errorText}</p> : null}
      </section>
    </main>
  )
}

export default AuthPage
