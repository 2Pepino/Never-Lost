// Stock synchronization: pulls the current stock from a store's database via a
// configured API connection and turns it into a patch for the inventory model
// in StoreContext.
//
// A connection can be a real HTTP API (live fetch with method, auth header and
// API key) or a "demo data source" that uses the simulated store database, so
// the flow also works without an external server.

import { fetchMockStoreDatabase } from './mockStoreApi.js'
import { sanitizeAuthHeader, sanitizeHttpMethod, validateApiUrl } from './security.js'

// Turns an external API response into a uniform list { sku, warehouse, shelves }.
// Supports the most common shapes ({ inventory/items/data: [...] } or an array
// directly) and various field names per row.
export function normalizeStockResponse(data) {
  const list = Array.isArray(data) ? data : data?.inventory || data?.items || data?.data || []
  if (!Array.isArray(list)) return []

  return list
    .map((row) => {
      const sku = row.sku ?? row.id ?? row.productId ?? row.productCode
      if (!sku) return null
      const stock = row.stock && typeof row.stock === 'object' ? row.stock : null
      const warehouse = Number(
        stock?.warehouse ?? row.warehouse ?? row.warehouseStock ?? row.stockWarehouse ?? 0,
      )
      const shelf = Number(
        stock?.shelf ?? row.shelves ?? row.shelf ?? row.shelfStock ?? row.stockShelves ?? 0,
      )
      return {
        sku: String(sku),
        warehouse: Number.isFinite(warehouse) ? Math.max(0, Math.round(warehouse)) : 0,
        shelf: Number.isFinite(shelf) ? Math.max(0, Math.round(shelf)) : 0,
      }
    })
    .filter(Boolean)
}

// Fetches the stock from the connection. Demo data source -> simulated database;
// otherwise a real HTTP fetch. Throws a clear error on network/status problems.
export async function fetchStock(connection, storeId) {
  if (!connection) throw new Error('No connection provided.')

  if (connection.demo) {
    const data = await fetchMockStoreDatabase(storeId)
    return normalizeStockResponse(data)
  }

  if (!connection.baseUrl) throw new Error('This connection has no API URL.')

  const urlCheck = validateApiUrl(connection.baseUrl)
  if (!urlCheck.ok) throw new Error(urlCheck.error)

  const headers = { Accept: 'application/json' }
  if (connection.authHeader && connection.apiKey) {
    const headerName = sanitizeAuthHeader(connection.authHeader)
    if (!headerName) throw new Error('The authorization header name is invalid.')
    headers[headerName] = connection.apiKey
  }

  const method = sanitizeHttpMethod(connection.method)

  let res
  try {
    res = await fetch(urlCheck.url, { method, headers })
  } catch {
    throw new Error('Could not reach the API (network or CORS).')
  }
  if (!res.ok) throw new Error(`API returned status ${res.status}${res.statusText ? ` (${res.statusText})` : ''}.`)

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('The API did not return valid JSON.')
  }
  return normalizeStockResponse(data)
}

// Builds the inventory patch { [productId]: { warehouse, shelf } } from the
// fetched rows, limited to products this store actually carries. `current`
// (optional) lets us count how many products actually change.
export function buildStockPatch(rows, storeProducts, current = {}) {
  const exists = new Set(storeProducts.map((p) => p.id))
  const patch = {}
  let changed = 0

  for (const row of rows) {
    if (!exists.has(row.sku)) continue
    patch[row.sku] = { warehouse: row.warehouse, shelf: row.shelf }
    const old = current[row.sku]
    const prevShelf = old?.shelf ?? old?.shelves ?? 0
    if (!old || old.warehouse !== row.warehouse || prevShelf !== row.shelf) changed += 1
  }

  return { patch, recognized: Object.keys(patch).length, changed }
}
