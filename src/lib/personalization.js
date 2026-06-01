import { getStore } from '../data/stores.js'

// Filter -> score -> sort. Profile department preferences use the store's department.

export function rankProducts(products, profile) {
  const isMember = !!profile?.preferences

  const enriched = products.map((p) => {
    let score = 0
    let reason = null
    const storeDept = getStore(p.storeId)?.department

    if (isMember && storeDept && profile.preferences.departments.includes(storeDept)) {
      score += 20
      reason = 'Your type of store'
    }

    if (!p.inStock) score -= 100

    return { ...p, _score: score, _reason: reason, _warning: null }
  })

  enriched.sort((a, b) => {
    if (isMember && b._score !== a._score) return b._score - a._score
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return enriched
}

export function rankAlternatives(product, allProducts, profile) {
  const isMember = !!profile?.preferences

  const candidates = allProducts.filter(
    (p) => p.storeId === product.storeId && p.category === product.category && p.id !== product.id && p.inStock,
  )

  const enriched = candidates.map((p) => {
    let score = 0
    let reason = 'Same category'

    if (!isMember) {
      score += Math.max(0, 20 - p.price)
      reason = p.price < product.price ? 'Cheaper' : 'Same category'
    }

    score += Math.max(0, 15 - Math.abs(p.price - product.price))

    return { ...p, _score: score, _reason: reason }
  })

  enriched.sort((a, b) => b._score - a._score)
  return enriched
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export function findSameProductOtherStores(product, allProducts) {
  const name = normalizeText(product.name)

  return allProducts
    .filter(
      (p) =>
        p.id !== product.id &&
        p.storeId !== product.storeId &&
        normalizeText(p.name) === name &&
        p.inStock,
    )
    .map((p) => ({ ...p, _reason: 'Same product' }))
}
