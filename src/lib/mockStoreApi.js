export async function mockStoreDatabaseResponse(storeId) {
  const res = await fetch(`/api/stores/${encodeURIComponent(storeId)}/products`)
  if (!res.ok) throw new Error(`Demo database unavailable (${res.status})`)
  const { products } = await res.json()

  const inventory = products.map((p) => ({
    sku: p.id,
    name: p.name,
    warehouse: p.stock?.warehouse ?? 0,
    shelves: p.stock?.shelf ?? 0,
  }))

  return {
    store: storeId,
    source: 'demo-database',
    fetchedAt: new Date().toISOString(),
    count: inventory.length,
    inventory,
  }
}

export function fetchMockStoreDatabase(storeId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      mockStoreDatabaseResponse(storeId).then(resolve).catch(reject)
    }, 400)
  })
}
