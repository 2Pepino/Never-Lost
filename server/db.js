import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DB_SCHEMA_VERSION, seedDatabase } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DB_PATH = path.join(DATA_DIR, 'db.json')

const EMPTY_DB = {
  schema_version: DB_SCHEMA_VERSION,
  categories: [],
  products: [],
  floorplans: [],
}

let db = null

function readDbFile() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(EMPTY_DB, null, 2), 'utf8')
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
}

function writeDbFile(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8')
}

function needsReseed(data) {
  if (!data.products?.length) return true
  if (data.schema_version !== DB_SCHEMA_VERSION) return true
  const p = data.products[0]
  if (!p?.stock || typeof p.stock.shelf !== 'number') return true
  if (p.category?.startsWith('category')) return true
  if ('warehouse_stock' in p || 'shelf_stock' in p || 'department' in p) return true
  const countForStore = data.products.filter((row) => row.store_id === 'ah-xl').length
  if (countForStore !== 200) return true
  return false
}

export function getDb() {
  if (!db) {
    db = readDbFile()
    const floorplans = db.floorplans ?? []
    if (needsReseed(db)) {
      db = { schema_version: DB_SCHEMA_VERSION, categories: [], products: [], floorplans }
      seedDatabase(db)
      writeDbFile(db)
    }
  }
  return db
}

export function persistDb() {
  if (db) writeDbFile(db)
}

/** API product shape (+ storeId for cross-store app logic). */
function rowToProduct(row) {
  const stock = {
    shelf: row.stock?.shelf ?? 0,
    warehouse: row.stock?.warehouse ?? 0,
  }
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    category: row.category,
    price: row.price,
    stock,
  }
}

export function listCategories(storeId) {
  const database = getDb()
  return database.categories
    .filter((c) => c.store_id === storeId)
    .sort((a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug))
    .map((c) => ({
      id: c.id,
      storeId: c.store_id,
      slug: c.slug,
      name: c.name,
      sortOrder: c.sort_order,
    }))
}

export function listProducts(storeId = null) {
  const database = getDb()
  const rows = storeId
    ? database.products.filter((p) => p.store_id === storeId)
    : database.products
  return rows
    .sort(
      (a, b) =>
        a.store_id.localeCompare(b.store_id) ||
        a.category.localeCompare(b.category) ||
        a.sort_order - b.sort_order ||
        a.name.localeCompare(b.name),
    )
    .map(rowToProduct)
}

export function getStoreCatalog(storeId) {
  const products = listProducts(storeId).map(({ storeId: _s, ...rest }) => rest)
  const categories = listCategories(storeId).map((c) => c.slug)
  return { storeId, categories, products }
}

export function getFullCatalog() {
  const database = getDb()
  const storeIds = [...new Set(database.products.map((p) => p.store_id))]
  const stores = {}
  for (const storeId of storeIds) {
    stores[storeId] = getStoreCatalog(storeId)
  }
  return { stores }
}

export function getProduct(id) {
  const row = getDb().products.find((p) => p.id === id)
  return row ? rowToProduct(row) : null
}

export function getFloorplan(storeId) {
  const row = getDb().floorplans.find((f) => f.store_id === storeId)
  if (!row) return null
  return {
    storeId: row.store_id,
    elements: Array.isArray(row.elements) ? row.elements : [],
    updatedAt: row.updated_at,
  }
}

export function saveFloorplan(storeId, elements) {
  const database = getDb()
  const updatedAt = new Date().toISOString()
  const existing = database.floorplans.findIndex((f) => f.store_id === storeId)
  const record = { store_id: storeId, elements, updated_at: updatedAt }
  if (existing >= 0) database.floorplans[existing] = record
  else database.floorplans.push(record)
  persistDb()
  return { storeId, elements, updatedAt }
}
