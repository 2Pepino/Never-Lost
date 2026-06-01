import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import { getStore } from '../data/stores.js'
import { fuzzySearchProducts } from '../lib/fuzzySearch.js'
import { formatCategoryLabel } from '../lib/productCategories.js'
import ManagerHeader from '../components/ManagerHeader.jsx'

// A product counts as "low" once the total stock is at or below this.
const LOW_STOCK_THRESHOLD = 5

function statusFor(p) {
  const total = (p.stock?.warehouse ?? 0) + (p.stock?.shelf ?? 0)
  if (total === 0) return { label: 'Out of stock', color: 'bg-rose-100 text-rose-700' }
  if (total <= LOW_STOCK_THRESHOLD) return { label: 'Low stock', color: 'bg-amber-100 text-amber-700' }
  if (!p.onShelf) return { label: 'Warehouse only', color: 'bg-slate-100 text-slate-600' }
  return { label: 'In stock', color: 'bg-emerald-100 text-emerald-700' }
}

// One store's catalog: all products with live stock and price data.
// This is the source of truth about what the store carries; customers match
// their list against it when they pick this store.
export default function CatalogPage() {
  const { activeManager, isManagerLoggedIn, productsByStoreLive } = useStore()
  const store = activeManager ? getStore(activeManager.storeId) : null

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const products = useMemo(
    () => (store ? productsByStoreLive(store.id) : []),
    [productsByStoreLive, store],
  )

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category))
    return ['all', ...[...set].sort((a, b) => a.localeCompare(b))]
  }, [products])

  const visible = useMemo(() => {
    let list = category === 'all' ? products : products.filter((p) => p.category === category)
    list = fuzzySearchProducts(list, search)
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [products, category, search])

  const summary = useMemo(() => {
    let inStock = 0
    let low = 0
    let out = 0
    for (const p of products) {
      const total = (p.stock?.warehouse ?? 0) + (p.stock?.shelf ?? 0)
      if (total === 0) out++
      else if (total <= LOW_STOCK_THRESHOLD) low++
      else inStock++
    }
    return { total: products.length, inStock, low, out }
  }, [products])

  if (!isManagerLoggedIn || !store) return <Navigate to="/manage/login" replace />

  return (
    <div className="manage-layout flex flex-col bg-[#f6f4fc]">
      <ManagerHeader store={store} title="Catalog" subtitle={`${store.name} · live stock`} />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile label="Products" value={summary.total} color="text-slate-800" background="bg-white" />
            <SummaryTile label="In stock" value={summary.inStock} color="text-emerald-600" background="bg-emerald-50 ring-emerald-100" />
            <SummaryTile label={`Low stock (≤ ${LOW_STOCK_THRESHOLD})`} value={summary.low} color="text-amber-600" background="bg-amber-50 ring-amber-100" />
            <SummaryTile label="Out of stock" value={summary.out} color="text-rose-600" background="bg-rose-50 ring-rose-100" />
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or category…"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-brand-400"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All categories' : formatCategoryLabel(c)}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Product</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Warehouse</th>
                  <th className="px-4 py-3 text-right">Shelf</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.length ? (
                  visible.map((p) => {
                    const status = statusFor(p)
                    return (
                      <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{p.name}</p>
                        </td>
                        <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{formatCategoryLabel(p.category)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">€ {p.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">{p.stock?.warehouse ?? 0}</td>
                        <td className={`px-4 py-3 text-right tabular-nums font-medium ${(p.stock?.shelf ?? 0) > 0 ? 'text-slate-700' : 'text-rose-500'}`}>
                          {p.stock?.shelf ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                      No products found{search ? ` for "${search}"` : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-center text-xs text-slate-400">
            {visible.length} of {summary.total} products · stock updates when you sync connections
          </p>
        </div>
      </div>
    </div>
  )
}

function SummaryTile({ label, value, color, background }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 ${background}`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  )
}
