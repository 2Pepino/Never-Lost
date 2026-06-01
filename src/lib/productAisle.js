/** Demo floor plan: place products by category when no custom layout exists. */

function aisleSlotForIndex(index) {
  const col = index % 5
  const row = Math.floor(index / 5)
  return {
    label: `Aisle ${index + 1}`,
    x: 12 + col * 19,
    y: 22 + row * 18,
  }
}

export function getCategoryAisleMap(products) {
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'en', { numeric: true }),
  )
  const map = new Map()
  categories.forEach((category, index) => {
    map.set(category, aisleSlotForIndex(index))
  })
  return map
}

export function resolveAisleLocation(product, aisleMap) {
  if (product.shelfLocation) return product.shelfLocation
  if (!product.category) return null
  const slot = aisleMap.get(product.category)
  if (!slot) return null
  return { label: slot.label, x: slot.x, y: slot.y }
}
