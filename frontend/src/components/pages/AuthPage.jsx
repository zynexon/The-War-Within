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
}) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[400px] flex-col px-5 pt-8 pb-6">
      <div className="text-center text-2xl font-black tracking-[0.12em] text-zinc-900 mb-8">
        ZYNEXON
      </div>

      <section className="text-center mt-2 px-6 animate-[fadeIn_0.6s_ease]">
        <h1 className="text-2xl font-bold text-zinc-900">Win your day.</h1>
        <p className="text-gray-500 mt-2">Or watch yourself lose it.</p>

        <div className="mt-4 text-sm text-gray-600 space-y-1">
          <p>🔥 Build streaks</p>
          <p>⚡ Earn XP daily</p>
          <p>🏆 Compete with others</p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-zinc-200 bg-white px-4 py-5 shadow-md transition-transform duration-200 hover:scale-[1.01] animate-[fadeIn_0.6s_ease]">
        <div className="mb-4 flex gap-2 text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 transition ${authMode === 'login' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}
            onClick={() => setAuthMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 transition ${authMode === 'register' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}
            onClick={() => setAuthMode('register')}
          >
            Register
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleAuthSubmit}>
          {authMode === 'register' ? (
            <input
              type="text"
              required
              maxLength={30}
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Name"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          ) : null}
          <input
            type="email"
            required
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
          <input
            type="password"
            required
            minLength={8}
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
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
              <p className="text-xs text-center mt-2 text-gray-500">Join others already building discipline.</p>
            </>
          ) : null}
        </form>

        {errorText ? <p className="mt-3 text-xs font-semibold text-red-600">{errorText}</p> : null}
      </section>
    </main>
  )
}

export default AuthPage
