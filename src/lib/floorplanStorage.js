import { normalizeElement } from './floorplanGeometry.js'

export const FLOORPLAN_CHANGE_EVENT = 'storenav-floorplan-change'

const cache = new Map()

function normalizePlan(data) {
  if (!data?.elements || !Array.isArray(data.elements)) {
    return { storeId: data?.storeId, elements: [], updatedAt: data?.updatedAt ?? null }
  }
  return {
    ...data,
    elements: data.elements.map(normalizeElement),
  }
}

export function getCachedFloorplan(storeId) {
  return cache.get(storeId) ?? null
}

export async function loadFloorplan(storeId) {
  if (!storeId) return null
  if (cache.has(storeId)) return cache.get(storeId)

  try {
    const res = await fetch(`/api/stores/${encodeURIComponent(storeId)}/floorplan`)
    if (!res.ok) throw new Error(`Floor plan request failed (${res.status})`)
    const data = normalizePlan(await res.json())
    cache.set(storeId, data)
    return data
  } catch {
    return { storeId, elements: [], updatedAt: null }
  }
}

export async function saveFloorplan(storeId, elements) {
  const serialized = JSON.stringify(elements)
  const cached = cache.get(storeId)
  if (cached && JSON.stringify(cached.elements) === serialized) {
    return cached
  }

  const res = await fetch(`/api/stores/${encodeURIComponent(storeId)}/floorplan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ elements }),
  })
  if (!res.ok) throw new Error(`Could not save floor plan (${res.status})`)

  const data = normalizePlan(await res.json())
  cache.set(storeId, data)
  window.dispatchEvent(
    new CustomEvent(FLOORPLAN_CHANGE_EVENT, { detail: { storeId } }),
  )
  return data
}

export async function getEntrancePosition(storeId, fallback = { x: 50, y: 96 }) {
  const plan = await loadFloorplan(storeId)
  if (!plan) return fallback
  const entrance = plan.elements.find((el) => el.type === 'entrance')
  return entrance ? { x: entrance.x, y: entrance.y } : fallback
}
