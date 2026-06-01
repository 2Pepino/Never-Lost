import { Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import { getStore } from '../data/stores.js'

// One alternative when shelves are empty, with an explanation of why it's recommended.
export default function AlternativeCard({ product, otherStore = false }) {
  const { inCart, addToCart, removeFromCart } = useStore()
  const inCartLocal = inCart(product.id)
  const store = otherStore ? getStore(product.storeId) : null

  const content = (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-lg">
        {otherStore ? '🏪' : '✅'}
      </span>
      <div className="flex-1">
        <p className="font-medium text-slate-800">{product.name}</p>
        <p className="text-xs text-slate-500">
          € {product.price.toFixed(2)}
          {otherStore && store ? ` · ${store.name}` : ''}
        </p>
        <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          {otherStore && store ? `Available at ${store.name}` : product._reason}
        </span>
      </div>
    </>
  )

  if (otherStore) {
    return (
      <Link
        to={`/store/${product.storeId}/product/${product.id}`}
        className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition hover:ring-brand-200 active:scale-[0.99]"
      >
        {content}
        <span className="shrink-0 text-brand-600">→</span>
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      {content}
      <button
        onClick={() => (inCartLocal ? removeFromCart(product.id) : addToCart(product.id))}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold transition active:scale-90 ${
          inCartLocal ? 'bg-brand-600 text-white shadow-sm shadow-brand-300' : 'bg-brand-100 text-brand-600'
        }`}
        aria-label={inCartLocal ? 'Remove from cart' : 'Add to cart'}
      >
        {inCartLocal ? '✓' : '+'}
      </button>
    </div>
  )
}
