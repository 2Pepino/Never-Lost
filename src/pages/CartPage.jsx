import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import StoreLogo from '../components/StoreLogo.jsx'

// The cart is your shopping list: products you added from stores or search.
// At the bottom you pick a store to start the route.
export default function CartPage() {
  const { cart, storesForList, removeFromCart, clearCart, isCheckedOff, toggleCheckedOff } = useStore()
  const navigate = useNavigate()

  if (cart.length === 0) {
    return (
      <div>
        <PageHeader title="Cart" subtitle="0 items" />
        <div className="space-y-5 px-4 py-4">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
            <p className="text-5xl">🛍️</p>
            <p className="mt-3 text-slate-500">Your list is still empty.</p>
            <p className="mt-1 text-xs text-slate-400">Add products from a store or use search below.</p>
          </div>
          <ManualAddSection />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Cart"
        subtitle={`${cart.length} ${cart.length === 1 ? 'item' : 'items'} on your list`}
      />

      <div className="space-y-5 px-4 py-4">
        {/* The full list: products, checkable. */}
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <ul className="space-y-1">
            {cart.map((it) => {
              const checked = isCheckedOff(it.key)
              return (
                <li key={it.key} className="flex items-center gap-3 py-1.5">
                  <button
                    onClick={() => toggleCheckedOff(it.key)}
                    aria-label={checked ? 'Uncheck' : 'Mark as picked up'}
                    aria-pressed={checked}
                    className="tap-target -my-1 flex shrink-0 items-center justify-center"
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                        checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${checked ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {it.label}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromCart(it.key)}
                    aria-label="Remove"
                    className="tap-target -my-1 flex shrink-0 items-center justify-center text-slate-300 transition hover:text-rose-500"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-rose-50">✕</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Search for products yourself and add them to the list. */}
        <ManualAddSection />

        {/* Store choice: this is where the route gets built. We highlight the
            store where you can get the most products from your list in one go. */}
        {storesForList.length === 0 ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="mb-1 font-bold text-slate-800">Where are you going?</p>
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">
              No store found yet that can supply this list.
            </p>
          </section>
        ) : (
          <>
            {(() => {
              const best = storesForList[0]
              return (
                <section className="rounded-2xl bg-white p-4 shadow-sm ring-2 ring-brand-200">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-500">
                    Most products in one store
                  </p>
                  <div className="flex items-center gap-3">
                    <StoreLogo store={best.store} sizeClass="h-12 w-12" emojiClass="text-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-800">{best.store.name}</p>
                      <p className="text-xs text-slate-500">
                        {best.count} of {best.total} items here · ± € {best.totalPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => navigate(`/store/${best.store.id}`)}
                      className="flex-1 rounded-full bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
                    >
                      Open store →
                    </button>
                    {best.store.hasFloorplan && (
                      <button
                        onClick={() => navigate(`/store/${best.store.id}?plan=1`)}
                        className="flex-1 rounded-full bg-brand-100 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-200 active:scale-[0.98]"
                      >
                        🗺️ View store plan
                      </button>
                    )}
                  </div>
                </section>
              )
            })()}

            {storesForList.length > 1 && (
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <p className="mb-3 text-xs font-semibold text-slate-500">Other stores</p>
                <div className="space-y-2">
                  {storesForList.slice(1).map(({ store, count, total, totalPrice }) => (
                    <button
                      key={store.id}
                      onClick={() => navigate(`/store/${store.id}`)}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left ring-1 ring-slate-100 transition hover:ring-brand-300 active:scale-[0.98]"
                    >
                      <StoreLogo store={store} sizeClass="h-10 w-10" emojiClass="text-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-800">{store.name}</p>
                        <p className="text-xs text-slate-400">
                          {count} of {total} items · ± € {totalPrice.toFixed(2)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-brand-600">→</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <button
          onClick={clearCart}
          className="w-full rounded-full bg-slate-100 py-3 text-sm font-medium text-slate-500 transition hover:bg-slate-200 active:scale-[0.98]"
        >
          Clear list
        </button>
      </div>
    </div>
  )
}

// Lets the customer search the assortment and manually add products to the
// list. We search across all stores by name and category.
function ManualAddSection() {
  const { allProductsLive, addToCart, inCart } = useStore()
  const [search, setSearch] = useState('')

  const results = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return []
    return allProductsLive
      .filter((p) => !inCart(p.id))
      .filter((p) => [p.name, p.category].some((v) => v?.toLowerCase().includes(term)))
      .slice(0, 6)
  }, [search, allProductsLive, inCart])

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <p className="mb-1 font-bold text-slate-800">Add something yourself</p>
      <p className="mb-3 text-xs text-slate-400">Search for a product and tap to put it on your list.</p>

      <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 ring-1 ring-slate-200 focus-within:ring-brand-300">
        <span className="text-slate-400">🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="E.g. milk, pasta, chicken…"
          className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        {search && (
          <button onClick={() => setSearch('')} aria-label="Clear" className="text-slate-300 transition hover:text-slate-500">
            ✕
          </button>
        )}
      </div>

      {search.trim() && (
        <ul className="mt-3 space-y-1">
          {results.length === 0 ? (
            <li className="px-1 py-2 text-sm text-slate-400">No product found for “{search.trim()}”.</li>
          ) : (
            results.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    addToCart(p.id)
                    setSearch('')
                  }}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left ring-1 ring-slate-100 transition hover:ring-brand-300 active:scale-[0.98]"
                >
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-slate-800">{p.name}</span>
                    <span className="block text-xs text-slate-400">€ {p.price.toFixed(2)}</span>
                  </span>
                  <span className="shrink-0 text-lg font-semibold text-brand-600">＋</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  )
}
