const items = ['Home', 'Journal', 'Leaderboard', 'Profile']

function Navbar({ activeTab, onChange }) {
  return (
    <nav className="sticky bottom-6 mt-8 rounded-full border border-zinc-200/80 bg-white/95 px-3 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md">
      <ul className="flex items-center justify-between text-center text-[11px] font-bold tracking-wide">
        {items.map((item) => (
          <li key={item} className="flex-1">
            <button
              type="button"
              onClick={() => onChange(item)}
              className={`w-full rounded-full py-2.5 transition-all duration-300 ${
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
  )
}

export default Navbar
