// Live stock overlay: enriches catalog products with shelf/warehouse counts and status.

const DEFAULT_TARGET_SHELF = 10

export function buildInitialInventory(products) {
  const inv = {}
  for (const p of products) {
    inv[p.id] = {
      shelf: p.stock?.shelf ?? 0,
      warehouse: p.stock?.warehouse ?? 0,
    }
  }
  return inv
}

export function enrichProduct(product, liveStock) {
  if (!product) return null

  const shelf = liveStock?.shelf ?? product.stock?.shelf ?? 0
  const warehouse = liveStock?.warehouse ?? product.stock?.warehouse ?? 0
  const onShelf = shelf > 0
  const inWarehouse = warehouse > 0
  let stockStatus = 'shelf'
  if (!onShelf && inWarehouse) stockStatus = 'warehouse'
  if (!onShelf && !inWarehouse) stockStatus = 'out'

  return {
    ...product,
    stock: { shelf, warehouse },
    targetShelfStock: DEFAULT_TARGET_SHELF,
    inStock: onShelf,
    onShelf,
    inWarehouse,
    stockStatus,
  }
}
