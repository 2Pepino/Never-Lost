import { useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import { getStore } from '../data/stores.js'
import { rankProducts } from '../lib/personalization.js'
import { formatCategoryLabel } from '../lib/productCategories.js'
import PageHeader from '../components/PageHeader.jsx'
import SearchBar from '../components/SearchBar.jsx'
import ProductRow from '../components/ProductRow.jsx'
import Floorplan from '../components/Floorplan.jsx'
import { useFloorplan } from '../lib/useFloorplan.js'

const CAT_EMOJI = {
  pasta: '🍝', bread: '🍞', dairy: '🥛', coffee: '☕', soda: '🥤', snacks: '🍿',
  fruit: '🍎', vegetables: '🥦', meat: '🥩', fish: '🐟', breakfast: '🥣',
  audio: '🎧', accessories: '🔌', smartphones: '📱', computers: '💻', tv: '📺', gaming: '🎮',
  'ball-sports': '⚽', 'sports-nutrition': '🥨', shoes: '👟', clothing: '👕', fitness: '🏋️', cycling: '🚲',
  'building-toys': '🧱', plush: '🧸', games: '🎲', hobby: '🎨',
}
const catEmoji = (c) => CAT_EMOJI[c] || '🛒'
const catLabel = (c) => formatCategoryLabel(c)

export default function StorePage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { activeProfile, productCount, productsByStoreLive, resolveCartForStore } = useStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(null)
  // From the cart you can open the store plan directly (?plan=1).
  const [showMap, setShowMap] = useState(searchParams.get('plan') === '1')

  const store = getStore(id)
  const { hasPlan } = useFloorplan(id)
  const storeProducts = useMemo(() => productsByStoreLive(id), [productsByStoreLive, id])

  // Resolve the shopping list against this store's assortment here: this is
  // where the store gets linked to the list and the route is created.
  const myStops = useMemo(() => {
    const resolved = resolveCartForStore(id)
    return [...new Set(resolved.filter((r) => r.product).map((r) => r.product.id))]
  }, [resolveCartForStore, id])

  const categories = useMemo(() => {
    const m = new Map()
    for (const p of storeProducts) m.set(p.category, (m.get(p.category) || 0) + 1)
    return [...m.entries()].map(([cat, count]) => ({ cat, count })).sort((a, b) => a.cat.localeCompare(b.cat))
  }, [storeProducts])

  const searchActive = search.trim().length > 0

  const results = useMemo(() => {
    let list = storeProducts
    if (searchActive) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q),
      )
    } else if (category) {
      list = list.filter((p) => p.category === category)
    }
    return rankProducts(list, activeProfile)
  }, [storeProducts, search, searchActive, category, activeProfile])

  if (!store) return <Navigate to="/" replace />

  const showFloorplan = store.hasFloorplan || hasPlan
  const showProducts = searchActive || category

  return (
    <div>
      <PageHeader
        title={store.name}
        subtitle={`${store.type} · ${store.cashback}% cashback`}
        back
        right={
          <Link to="/cart" aria-label="To cart" className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25">
            🛍️
            {productCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-brand-700">
                {productCount}
              </span>
            )}
          </Link>
        }
      />

      <div className="space-y-4 px-4 py-4">
        <SearchBar value={search} onChange={setSearch} placeholder={`Search in ${store.name}`} />

        {showFloorplan ? (
          <button
            onClick={() => setShowMap((v) => !v)}
            className={`w-full rounded-full py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
              showMap ? 'bg-slate-100 text-slate-500' : 'bg-brand-100 text-brand-700 hover:bg-brand-200'
            }`}
          >
            {showMap ? 'Hide floor plan' : '🗺️ View the floor plan'}
          </button>
        ) : (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
            🗺️ Floor plan coming soon for this store
          </div>
        )}

        {showMap && showFloorplan ? (
          <div>
            <p className="mb-2 text-xs text-slate-400">
              {myStops.length > 0
                ? 'Tap the map to choose your starting point — then the route runs along your products to the exit.'
                : 'Add products to your cart to see the route.'}
            </p>
            <Floorplan storeId={store.id} products={storeProducts} routeIds={myStops} />
          </div>
        ) : !showProducts ? (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-500">Categories</h2>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(({ cat, count }) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-100 transition hover:ring-brand-200 active:scale-[0.97]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl">
                    {catEmoji(cat)}
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-800">{catLabel(cat)}</span>
                    <span className="block text-xs text-slate-400">{count} products</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-500">
                {searchActive ? `Results for "${search}"` : `${catEmoji(category)} ${catLabel(category)}`}
                {!searchActive && activeProfile.type !== 'guest' && (
                  <span className="font-normal"> · for your preference</span>
                )}
              </h2>
              {!searchActive && category && (
                <button onClick={() => setCategory(null)} className="text-xs font-medium text-brand-600">
                  ← Categories
                </button>
              )}
            </div>
            <div className="space-y-2">
              {results.length ? (
                results.map((p) => <ProductRow key={p.id} product={p} />)
              ) : (
                <p className="text-sm text-slate-400">Nothing found.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
