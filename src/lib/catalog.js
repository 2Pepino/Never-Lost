/** In-memory catalog loaded from the backend API (split per store). */

let products = []
let categoriesByStore = {}
let loadPromise = null

export function isCatalogLoaded() {
  return products.length > 0
}

export async function fetchCatalog() {
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const res = await fetch('/api/catalog')
    if (!res.ok) {
      throw new Error(`Could not load catalog (${res.status}). Is the API server running?`)
    }
    const data = await res.json()
    const stores = data.stores ?? {}
    products = []
    categoriesByStore = {}

    for (const [storeId, catalog] of Object.entries(stores)) {
      categoriesByStore[storeId] = (catalog.categories ?? []).map((slug) => ({
        slug,
        name: slug,
      }))
      for (const p of catalog.products ?? []) {
        products.push({ ...p, storeId })
      }
    }

    return { products, categoriesByStore }
  })()

  try {
    return await loadPromise
  } catch (e) {
    loadPromise = null
    throw e
  }
}

export function getProducts() {
  return products
}

export function getProduct(id) {
  return products.find((p) => p.id === id) || null
}

export function productsByStore(storeId) {
  return products.filter((p) => p.storeId === storeId)
}

export function categoriesForStore(storeId) {
  const fromApi = categoriesByStore[storeId]
  if (fromApi?.length) {
    return fromApi.map((c) => c.slug).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
  }
  const cats = new Set()
  for (const p of products) {
    if (p.storeId === storeId && p.category) cats.add(p.category)
  }
  return [...cats].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
}
