export function rankProducts(products) {
  const enriched = products.map((p) => ({
    ...p,
    _score: p.inStock ? 0 : -100,
    _reason: null,
    _warning: null,
  }))

  enriched.sort((a, b) => {
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return enriched
}

export function rankAlternatives(product, allProducts) {
  const candidates = allProducts.filter(
    (p) => p.storeId === product.storeId && p.category === product.category && p.id !== product.id && p.inStock,
  )

  const enriched = candidates.map((p) => ({
    ...p,
    _score: Math.max(0, 15 - Math.abs(p.price - product.price)),
    _reason: p.price < product.price ? 'Cheaper' : 'Same category',
  }))

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
