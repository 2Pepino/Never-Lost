import { getCategoryAisleMap, resolveAisleLocation } from './productAisle.js'

/** Grid and layout for the interactive demo floor plan. */

export const FULL = { x: 0, y: 0, w: 100, h: 104 }
export const MIN_W = 26
export const DEFAULT_START = { x: 50, y: 88 }
export const ENTRANCE_CORRIDOR_Y = 85
export const EXIT = { x: 50, y: 14, label: 'Exit' }
export const KASSA = { x: 75, y: 18, label: 'Checkout' }

export const AISLE_HALF = 2
export const RACK_W = 7
export const RACK_H = 5.5
export const SIDE_OFF = AISLE_HALF + RACK_W / 2

export function clampView(v) {
  let { x, y, w, h } = v
  w = Math.min(w, FULL.w)
  h = Math.min(h, FULL.h)
  x = Math.min(Math.max(x, 0), FULL.w - w)
  y = Math.min(Math.max(y, 0), FULL.h - h)
  return { x, y, w, h }
}

export function truncate(name, max) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

export function buildLayout(products) {
  const aisleMap = getCategoryAisleMap(products)
  const aisles = new Map()
  for (const p of products) {
    const loc = resolveAisleLocation(p, aisleMap)
    if (!loc) continue
    const key = loc.label
    if (!aisles.has(key)) {
      aisles.set(key, { label: key, cx: loc.x, cy: loc.y, items: [] })
    }
    aisles.get(key).items.push(p)
  }

  const racks = []
  const headers = []
  for (const g of aisles.values()) {
    const left = g.items.filter((_, i) => i % 2 === 0)
    const right = g.items.filter((_, i) => i % 2 === 1)

    const place = (list, side) => {
      const top = g.cy - (list.length * RACK_H) / 2
      list.forEach((p, j) => {
        racks.push({
          productId: p.id,
          name: p.name,
          category: p.category,
          label: g.label,
          rowY: g.cy,
          side,
          aisleX: g.cx,
          cx: g.cx + side * SIDE_OFF,
          cy: top + RACK_H / 2 + j * RACK_H,
        })
      })
    }
    place(left, -1)
    place(right, 1)

    const maxRows = Math.max(left.length, right.length)
    headers.push({
      label: g.label,
      cx: g.cx,
      aisleTop: g.cy - (maxRows * RACK_H) / 2,
    })
  }
  return { racks, headers }
}

export function rackEdgeX(rack) {
  return rack.cx - rack.side * (RACK_W / 2)
}

/** SVG coordinates from a click on the canvas. */
export function clientToSvgCoords(svg, clientX, clientY) {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 50, y: 50 }
  const svgPt = pt.matrixTransform(ctm.inverse())
  return {
    x: Math.max(6, Math.min(94, svgPt.x)),
    y: Math.max(10, Math.min(99, svgPt.y)),
  }
}
