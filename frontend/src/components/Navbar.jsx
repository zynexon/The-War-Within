const items = ['Home', 'Journal', 'Leaderboard', 'Profile']

function Navbar({ activeTab, onChange }) {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <nav className="bg-white/80 backdrop-blur-md shadow-lg rounded-full border border-black/70 px-4 py-2">
        <ul className="flex items-center gap-2 text-center text-[11px] font-bold tracking-wide">
        {items.map((item) => (
          <li key={item}>
            <button
              type="button"
              onClick={() => onChange(item)}
              className={`px-4 py-2 rounded-full transition-all duration-300 ${
                activeTab === item
                  ? 'bg-zinc-900 text-white shadow-md shadow-zinc-900/20'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              {item}
            </button>
          </li>
        ))}
        </ul>
      </nav>
    </div>
  )
}

export default Navbar
