import { randomUUID } from 'node:crypto'

// Store IDs match src/data/stores.js (display names unchanged in the app).
const STORES = ['ah-xl', 'mediamarkt', 'decathlon', 'hema', 'delhaize']

export const CATEGORIES_PER_STORE = 10
export const PRODUCTS_PER_CATEGORY = 20
export const DB_SCHEMA_VERSION = 3

export function seedDatabase(db) {
  db.schema_version = DB_SCHEMA_VERSION
  db.categories = []
  db.products = []

  for (const storeId of STORES) {
    for (let c = 1; c <= CATEGORIES_PER_STORE; c++) {
      const category = `cat${c}`
      db.categories.push({
        id: `${storeId}-${category}`,
        store_id: storeId,
        slug: category,
        name: category,
        sort_order: c,
      })

      for (let i = 1; i <= PRODUCTS_PER_CATEGORY; i++) {
        db.products.push({
          id: randomUUID(),
          store_id: storeId,
          name: `item ${i}`,
          category,
          price: Number((1 + (i % 10) * 0.25).toFixed(2)),
          stock: {
            shelf: 6 + (i % 8),
            warehouse: 80 + i * 3,
          },
          sort_order: i,
        })
      }
    }

    if (!db.floorplans.some((f) => f.store_id === storeId)) {
      db.floorplans.push({
        store_id: storeId,
        elements: [],
        updated_at: new Date().toISOString(),
      })
    }
  }
}
