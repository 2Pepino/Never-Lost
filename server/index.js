import express from 'express'
import cors from 'cors'
import {
  getDb,
  getFloorplan,
  getFullCatalog,
  getProduct,
  getStoreCatalog,
  listCategories,
  listProducts,
  saveFloorplan,
} from './db.js'

const PORT = Number(process.env.PORT) || 3001
const app = express()

app.use(cors({ origin: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

/** Full catalog split per store (for app bootstrap). */
app.get('/', (_req, res) => {
  res.json({ health: 'Go to /api/health to check if the server is running', catalog: 'Go to /api/catalog to get the full catalog', stores: 'Go to /api/stores/:storeId/catalog to get the catalog of a specific store' })
})

/** Full catalog split per store (for app bootstrap). */
app.get('/api/catalog', (_req, res) => {
  getDb()
  res.json(getFullCatalog())
})

/** One store's catalog: categories + products in the requested shape. */
app.get('/api/stores/:storeId/catalog', (req, res) => {
  getDb()
  res.json(getStoreCatalog(req.params.storeId))
})

app.get('/api/stores/:storeId/categories', (req, res) => {
  res.json({ categories: listCategories(req.params.storeId) })
})

app.get('/api/stores/:storeId/products', (req, res) => {
  const products = listProducts(req.params.storeId).map(({ storeId: _s, ...rest }) => rest)
  res.json({ products })
})

app.get('/api/products/:id', (req, res) => {
  const product = getProduct(req.params.id)
  if (!product) return res.status(404).json({ error: 'Product not found.' })
  const { storeId: _s, ...body } = product
  res.json({ product: body })
})

app.get('/api/stores/:storeId/floorplan', (req, res) => {
  const plan = getFloorplan(req.params.storeId)
  res.json(
    plan ?? {
      storeId: req.params.storeId,
      elements: [],
      updatedAt: null,
    },
  )
})

app.put('/api/stores/:storeId/floorplan', (req, res) => {
  const { elements } = req.body ?? {}
  if (!Array.isArray(elements)) {
    return res.status(400).json({ error: 'Body must include an elements array.' })
  }
  const saved = saveFloorplan(req.params.storeId, elements)
  res.json(saved)
})

app.listen(PORT, () => {
  getDb()
  console.log(`Never Lost API listening on http://localhost:${PORT}`)
})
