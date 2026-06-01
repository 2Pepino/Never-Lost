import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import { getStore } from '../data/stores.js'
import { rankAlternatives, findSameProductOtherStores } from '../lib/personalization.js'
import PageHeader from '../components/PageHeader.jsx'
import AlternativeCard from '../components/AlternativeCard.jsx'
import Floorplan from '../components/Floorplan.jsx'
import { useFloorplan } from '../lib/useFloorplan.js'

function StockBadge({ status }) {
  if (status === 'shelf') {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">In stock</span>
  }
  if (status === 'warehouse') {
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Not on shelves</span>
  }
  return <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-600">Out of stock</span>
}

export default function ProductPage() {
  const { id, pid } = useParams()
  const { activeProfile, inCart, addToCart, removeFromCart, getProductLive, allProductsLive, productsByStoreLive } = useStore()

  const store = getStore(id)
  const product = getProductLive(pid)
  const { hasPlan } = useFloorplan(id)

  const fullyOut = product?.stockStatus === 'out'

  const alternatives = useMemo(
    () => (product && fullyOut ? rankAlternatives(product, allProductsLive, activeProfile) : []),
    [product, fullyOut, activeProfile, allProductsLive],
  )

  const sameProductOtherStores = useMemo(
    () => (product && fullyOut ? findSameProductOtherStores(product, allProductsLive) : []),
    [product, fullyOut, allProductsLive],
  )

  if (!store || !product) return <Navigate to={`/store/${id}`} replace />

  const inCartLocal = inCart(product.id)
  const onShelves = product.stockStatus === 'shelf'
  const inWarehouse = product.stockStatus === 'warehouse'
  return (
    <div>
      <PageHeader title={product.name} subtitle={store.name} back />

      <div className="space-y-4 px-4 py-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-800">€ {product.price.toFixed(2)}</p>
            </div>
            <StockBadge status={product.stockStatus} />
          </div>

          {inWarehouse && (
            <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This product isn't on the shelves yet, but there's still stock in the warehouse.
            </div>
          )}

          {onShelves && (
            <button
              onClick={() => (inCartLocal ? removeFromCart(product.id) : addToCart(product.id))}
              className={`mt-4 w-full rounded-full py-3 text-sm font-semibold transition active:scale-[0.98] ${
                inCartLocal ? 'bg-brand-600 text-white shadow-md shadow-brand-200' : 'bg-brand-100 text-brand-700 hover:bg-brand-200'
              }`}
            >
              {inCartLocal ? '✓ In your cart — tap to remove' : '+ Add to cart'}
            </button>
          )}
        </div>

        {onShelves && hasPlan && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-500">Route to the shelves</h2>
            <Floorplan
              storeId={store.id}
              products={productsByStoreLive(id)}
              highlightId={product.id}
            />
          </div>
        )}

        {onShelves && store.hasFloorplan && !hasPlan && (
          <Link to="/cart" className="block rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
            🗺️ Add it to your cart and view the route along all your products there →
          </Link>
        )}

        {fullyOut && (
          <div className="space-y-4">
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
              This product is sold out at this store — both on the shelves and in the warehouse.
            </div>

            {alternatives.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-slate-500">
                  {activeProfile.type === 'guest'
                    ? 'Similar products in this store'
                    : 'Alternatives in this store that suit you'}
                </h2>
                <div className="space-y-2">
                  {alternatives.map((p) => (
                    <AlternativeCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}

            {sameProductOtherStores.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-slate-500">The same product at other stores</h2>
                <div className="space-y-2">
                  {sameProductOtherStores.map((p) => (
                    <AlternativeCard key={p.id} product={p} otherStore />
                  ))}
                </div>
              </section>
            )}

            {alternatives.length === 0 && sameProductOtherStores.length === 0 && (
              <p className="text-sm text-slate-400">No alternatives found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
