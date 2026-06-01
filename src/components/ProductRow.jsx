import { Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import { formatCategoryLabel } from '../lib/productCategories.js'

function stockLabel(product) {
  if (product.stockStatus === 'warehouse') return 'In warehouse only'
  if (product.stockStatus === 'out') return 'Out of stock'
  return null
}

// One row in a store's search results.
export default function ProductRow({ product }) {
  const { inCart, addToCart, removeFromCart } = useStore()
  const inCartLocal = inCart(product.id)
  const label = stockLabel(product)

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 transition hover:ring-slate-200">
      <Link to={`product/${product.id}`} className="flex flex-1 items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg">
          🛒
        </span>
        <span className="flex-1">
          <span className="flex items-center gap-2">
            <span className="font-medium text-slate-800">{product.name}</span>
            {product._reason && (
              <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-600">
                {product._reason}
              </span>
            )}
          </span>
          <span className="block text-xs text-slate-500">
            {formatCategoryLabel(product.category)} · € {product.price.toFixed(2)}
          </span>
          {product._warning && (
            <span className="mt-0.5 block text-[11px] text-amber-600">⚠ {product._warning}</span>
          )}
          {label && (
            <span
              className={`mt-0.5 block text-[11px] font-medium ${
                product.stockStatus === 'warehouse' ? 'text-amber-700' : 'text-rose-500'
              }`}
            >
              {label}
            </span>
          )}
        </span>
      </Link>

      {product.inStock ? (
        <button
          onClick={() => (inCartLocal ? removeFromCart(product.id) : addToCart(product.id))}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold transition active:scale-90 ${
            inCartLocal ? 'bg-brand-600 text-white shadow-sm shadow-brand-300' : 'bg-brand-100 text-brand-600'
          }`}
          aria-label={inCartLocal ? 'Remove from cart' : 'Add to cart'}
        >
          {inCartLocal ? '✓' : '+'}
        </button>
      ) : (
        <Link
          to={`product/${product.id}`}
          className="shrink-0 rounded-full bg-amber-100 px-3 py-2 text-xs font-medium text-amber-700"
        >
          {product.stockStatus === 'warehouse' ? 'Info' : 'Alternative'}
        </Link>
      )}
    </div>
  )
}
