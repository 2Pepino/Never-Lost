import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { stores, distanceToUser } from '../data/stores.js'
import StoreLogo from '../components/StoreLogo.jsx'
import SearchBar from '../components/SearchBar.jsx'
import PageHeader from '../components/PageHeader.jsx'

export default function ListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const sorted = useMemo(
    () =>
      stores
        .map((s) => ({ ...s, _distance: distanceToUser(s) }))
        .sort((a, b) => a._distance - b._distance),
    [],
  )

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return sorted
    return sorted.filter((s) =>
      [s.name, s.street, s.type].some((v) => v?.toLowerCase().includes(term)),
    )
  }, [search, sorted])

  return (
    <div>
      <PageHeader title="Home" />

      <div className="space-y-2 px-4 pb-6 pt-5">
        <SearchBar value={search} onChange={setSearch} placeholder="Search for a store" />

        {visible.length === 0 && (
          <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-100">
            No store found for “{search.trim()}”.
          </p>
        )}

        {visible.map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(`/store/${s.id}`)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-100 transition hover:ring-brand-300 active:scale-[0.98]"
          >
            <StoreLogo store={s} sizeClass="h-12 w-12" emojiClass="text-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800">{s.name}</p>
              <p className="truncate text-xs text-slate-500">{s.street}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-brand-600">{s._distance} km</p>
              <p className="text-[11px] text-slate-400">{s.type}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
