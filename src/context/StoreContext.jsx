import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getProfile } from '../data/profiles.js'
import { fetchCatalog, getProduct, getProducts } from '../lib/catalog.js'
import { stores } from '../data/stores.js'
import { getManager } from '../data/managers.js'
import { buildInitialInventory, enrichProduct } from '../lib/inventory.js'
import { pickBestProduct, labelForTerm } from '../lib/assistant.js'
import { loadConnections } from '../lib/connectionsStorage.js'
import { fetchStock, buildStockPatch } from '../lib/inventorySync.js'
import {
  clearSession,
  createSession,
  getSession,
  isManagerSession,
} from '../lib/security.js'
import { seedDemoAccounts } from '../lib/seedDemoAccounts.js'

// A cart item is store-independent: either an ingredient term
// (kind: 'ingredient'), or a concrete product you tapped in a store
// (kind: 'product'). It is only resolved once a store is chosen.
function normalizeCartItem(entry) {
  if (typeof entry === 'string') return { key: entry, kind: 'product' } // legacy storage
  if (entry && entry.key && (entry.kind === 'ingredient' || entry.kind === 'product')) {
    return { key: entry.key, kind: entry.kind }
  }
  return null
}

const StoreContext = createContext(null)

const DYNAMIC_PROFILE_KEY = 'storenav.dynamicProfile'
const ACCOUNTS_KEY = 'storenav.accounts'
const CART_KEY = 'storenav.cart'
const CHECKED_OFF_KEY = 'storenav.checkedOff'
const EDITS_KEY = 'storenav.profileEdits'
// Legacy keys — cleared on startup; auth now uses sessionStorage sessions.
const LEGACY_PROFILE_KEY = 'storenav.profileId'
const LEGACY_MANAGER_KEY = 'storenav.managerId'
const INVENTORY_KEY = 'storenav.inventory'
const INVENTORY_SEED_KEY = 'storenav.inventorySeed'
const INVENTORY_SEED_VERSION = '6'
export function getAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || {} }
  catch { return {} }
}

export function saveAccount(email, data) {
  const accounts = getAccounts()
  accounts[email.toLowerCase()] = data
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function clearLegacyAuthKeys() {
  localStorage.removeItem(LEGACY_PROFILE_KEY)
  localStorage.removeItem(LEGACY_MANAGER_KEY)
  localStorage.removeItem(DYNAMIC_PROFILE_KEY)
}

function loadAuthFromSession() {
  clearLegacyAuthKeys()
  const session = getSession()
  if (!session) {
    return { profileId: null, dynamicProfile: null, managerId: null }
  }

  if (session.type === 'manager') {
    return { profileId: null, dynamicProfile: null, managerId: session.subject }
  }

  if (session.type === 'customer-account') {
    try {
      const dynamicProfile = JSON.parse(sessionStorage.getItem(DYNAMIC_PROFILE_KEY)) || null
      if (dynamicProfile && (dynamicProfile.id === session.subject || dynamicProfile.person?.email === session.subject)) {
        return { profileId: null, dynamicProfile, managerId: null }
      }
    } catch {
      /* corrupt profile data */
    }
    clearSession()
    sessionStorage.removeItem(DYNAMIC_PROFILE_KEY)
    return { profileId: null, dynamicProfile: null, managerId: null }
  }

  clearSession()
  return { profileId: null, dynamicProfile: null, managerId: null }
}

// Merges the fields edited by the user with the base profile.
function mergeProfile(base, edit) {
  if (!base || !edit) return base
  return applyProfilePatch(base, edit)
}

function applyProfilePatch(base, patch) {
  if (!base || !patch) return base
  return {
    ...base,
    ...patch,
    preferences:
      patch.preferences !== undefined
        ? base.preferences
          ? { ...base.preferences, ...patch.preferences }
          : patch.preferences
        : base.preferences,
    person: patch.person ? { ...(base.person || {}), ...patch.person } : base.person,
  }
}

function loadInventory(catalogProducts) {
  try {
    const seed = localStorage.getItem(INVENTORY_SEED_KEY)
    const saved = JSON.parse(localStorage.getItem(INVENTORY_KEY))
    if (seed === INVENTORY_SEED_VERSION && saved && typeof saved === 'object') return saved
  } catch {
    /* ignore corrupt data */
  }
  const inv = buildInitialInventory(catalogProducts)
  localStorage.setItem(INVENTORY_SEED_KEY, INVENTORY_SEED_VERSION)
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv))
  return inv
}

export function StoreProvider({ children }) {
  const [catalogReady, setCatalogReady] = useState(false)
  const [catalogError, setCatalogError] = useState(null)
  const [catalogVersion, setCatalogVersion] = useState(0)

  const initialAuth = loadAuthFromSession()
  const [profileId, setProfileId] = useState(initialAuth.profileId)
  const [dynamicProfile, setDynamicProfile] = useState(initialAuth.dynamicProfile)
  const [cartItems, setCartItems] = useState(() => {
    try {
      return (JSON.parse(localStorage.getItem(CART_KEY)) || []).map(normalizeCartItem).filter(Boolean)
    } catch {
      return []
    }
  })
  const [checkedOff, setCheckedOff] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CHECKED_OFF_KEY)) || []
    } catch {
      return []
    }
  })
  const [managerId, setManagerId] = useState(initialAuth.managerId)
  const [edits, setEdits] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(EDITS_KEY)) || {}
    } catch {
      return {}
    }
  })
  const [inventory, setInventory] = useState({})

  useEffect(() => {
    let cancelled = false
    fetchCatalog()
      .then(() => {
        if (cancelled) return
        setCatalogVersion((v) => v + 1)
        setInventory(loadInventory(getProducts()))
        setCatalogReady(true)
      })
      .catch((e) => {
        if (!cancelled) setCatalogError(e.message || 'Could not load catalog.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const productList = useMemo(() => getProducts(), [catalogVersion])

  // Always keep the latest inventory at hand without rebuilding the sync callback
  // on every stock change.
  const inventoryRef = useRef(inventory)
  useEffect(() => {
    inventoryRef.current = inventory
  }, [inventory])

  useEffect(() => {
    void seedDemoAccounts()
  }, [])

  useEffect(() => {
    if (dynamicProfile) sessionStorage.setItem(DYNAMIC_PROFILE_KEY, JSON.stringify(dynamicProfile))
    else sessionStorage.removeItem(DYNAMIC_PROFILE_KEY)
  }, [dynamicProfile])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems))
  }, [cartItems])

  useEffect(() => {
    localStorage.setItem(CHECKED_OFF_KEY, JSON.stringify(checkedOff))
  }, [checkedOff])

  useEffect(() => {
    localStorage.setItem(EDITS_KEY, JSON.stringify(edits))
  }, [edits])

  useEffect(() => {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory))
  }, [inventory])

  const activeProfile = useMemo(
    () => dynamicProfile || mergeProfile(getProfile(profileId), edits[profileId]),
    [dynamicProfile, profileId, edits],
  )
  const activeManager = useMemo(() => getManager(managerId), [managerId])

  const getStock = useCallback((productId) => inventory[productId] ?? { shelf: 0, warehouse: 0 }, [inventory])

  const getProductLive = useCallback((id) => enrichProduct(getProduct(id), getStock(id)), [getStock])

  const productsByStoreLive = useCallback(
    (storeId) => productList.filter((p) => p.storeId === storeId).map((p) => enrichProduct(p, getStock(p.id))),
    [getStock, productList],
  )

  const allProductsLive = useMemo(
    () => productList.map((p) => enrichProduct(p, getStock(p.id))),
    [getStock, productList],
  )

  // The visible (store-independent) list: each item with a readable label.
  const cart = useMemo(
    () =>
      cartItems.map((it) => ({
        key: it.key,
        kind: it.kind,
        label: it.kind === 'ingredient' ? labelForTerm(it.key) : getProduct(it.key)?.name || it.key,
      })),
    [cartItems],
  )

  // Resolve the list against one store: per item the best matching live product
  // from that store (or null if the store doesn't carry it). This is the moment
  // stores get linked to the list.
  const resolveCartForStore = useCallback(
    (storeId) => {
      const pool = productsByStoreLive(storeId)
      const byId = new Map(pool.map((p) => [p.id, p]))
      return cartItems.map((item) => {
        const product =
          item.kind === 'product' ? byId.get(item.key) || null : pickBestProduct(pool, item.key)
        return { item, product }
      })
    },
    [productsByStoreLive, activeProfile, cartItems],
  )

  // Which stores can supply (part of) the list, with coverage and price.
  const storesForList = useMemo(() => {
    if (!cartItems.length) return []
    return stores
      .map((store) => {
        const resolved = resolveCartForStore(store.id)
        const found = resolved.filter((r) => r.product)
        // Dedup on product id: a product counts once for the price.
        const perId = new Map(found.map((r) => [r.product.id, r.product.price]))
        const totalPrice = [...perId.values()].reduce((sum, p) => sum + p, 0)
        return { store, count: perId.size, total: cartItems.length, totalPrice }
      })
      .filter((w) => w.count > 0)
      .sort((a, b) => b.count - a.count || a.totalPrice - b.totalPrice)
  }, [cartItems, resolveCartForStore])

  // Pulls the current stock from a store's database via a configured API
  // connection and applies it to the live inventory. Without a connectionId the
  // store's first active connection is used.
  const syncStockFromConnection = useCallback(
    async (storeId, connectionId = null) => {
      const active = loadConnections(storeId).filter((c) => c.active)
      const connection = connectionId ? active.find((c) => c.id === connectionId) : active[0]
      if (!connection) return { ok: false, error: 'No active connection found.' }

      try {
        const rows = await fetchStock(connection, storeId)
        const storeProducts = productList.filter((p) => p.storeId === storeId)
        const { patch, recognized, changed } = buildStockPatch(rows, storeProducts, inventoryRef.current)
        if (recognized === 0) {
          return { ok: false, error: 'No recognizable products in the API response.' }
        }
        setInventory((inv) => ({ ...inv, ...patch }))
        return { ok: true, recognized, changed, total: storeProducts.length }
      } catch (e) {
        return { ok: false, error: e.message || 'Synchronization failed.' }
      }
    },
    [productList],
  )

  const value = useMemo(
    () => ({
      activeProfile,
      isLoggedIn: !!activeProfile,
      isOwnAccount: !!dynamicProfile,
      login: (arg, sessionType) => {
        if (typeof arg === 'string') {
          if (!sessionType) throw new Error('login(profileId) requires a session type.')
          setDynamicProfile(null)
          setProfileId(arg)
          createSession(sessionType, arg)
        } else if (arg && typeof arg === 'object') {
          setProfileId(null)
          setDynamicProfile(arg)
          const subject = (arg.person?.email || arg.id || '').toLowerCase()
          createSession('customer-account', subject)
        }
      },
      logout: () => {
        clearSession()
        setDynamicProfile(null)
        setProfileId(null)
      },
      cart,
      cartItems,
      cartCount: cartItems.length,
      // Number of concrete products in the cart (excluding ingredient terms).
      productCount: cartItems.filter((it) => it.kind === 'product').length,
      resolveCartForStore,
      storesForList,
      // Add/check/remove a concrete product (tapped in a store).
      inCart: (id) => cartItems.some((it) => it.kind === 'product' && it.key === id),
      addToCart: (id) =>
        setCartItems((cur) =>
          cur.some((it) => it.kind === 'product' && it.key === id) ? cur : [...cur, { key: id, kind: 'product' }],
        ),
      // Add ingredient terms from the assistant/questionnaire. Each term is
      // immediately turned into the best matching concrete product so it also
      // lands in the cart. No match in the assortment? Then the term stays on
      // the list as an ingredient (nothing gets lost).
      addIngredients: (terms) =>
        setCartItems((cur) => {
          const existingProducts = new Set(
            cur.filter((it) => it.kind === 'product').map((it) => it.key),
          )
          const existingIngredients = new Set(
            cur.filter((it) => it.kind === 'ingredient').map((it) => it.key),
          )
          const toAdd = []
          for (const term of terms || []) {
            if (!term) continue
            const product = pickBestProduct(allProductsLive, term)
            if (product) {
              if (!existingProducts.has(product.id)) {
                toAdd.push({ key: product.id, kind: 'product' })
                existingProducts.add(product.id)
              }
            } else if (!existingIngredients.has(term)) {
              toAdd.push({ key: term, kind: 'ingredient' })
              existingIngredients.add(term)
            }
          }
          return toAdd.length ? [...cur, ...toAdd] : cur
        }),
      removeFromCart: (key) => {
        setCartItems((items) => items.filter((it) => it.key !== key))
        setCheckedOff((a) => a.filter((x) => x !== key))
      },
      clearCart: () => {
        setCartItems([])
        setCheckedOff([])
      },
      isCheckedOff: (key) => checkedOff.includes(key),
      toggleCheckedOff: (key) =>
        setCheckedOff((a) => (a.includes(key) ? a.filter((x) => x !== key) : [...a, key])),
      activeManager,
      isManagerLoggedIn: !!activeManager && isManagerSession(),
      managerLogin: (id) => {
        setManagerId(id)
        createSession('manager', id)
      },
      managerLogout: () => {
        clearSession()
        setManagerId(null)
      },
      updateProfile: (patch) => {
        if (dynamicProfile) {
          setDynamicProfile((p) => {
            const next = applyProfilePatch(p, patch)
            const email = (next.person?.email || next.id || '').toLowerCase()
            if (email) {
              const accounts = getAccounts()
              if (accounts[email]) {
                saveAccount(email, { ...accounts[email], profile: next })
              }
            }
            return next
          })
          return
        }
        if (!profileId) return
        setEdits((e) => {
          const current = e[profileId] || {}
          return { ...e, [profileId]: applyProfilePatch(current, patch) }
        })
      },
      inventory,
      getStock,
      getProductLive,
      productsByStoreLive,
      allProductsLive,
      syncStockFromConnection,
    }),
    [
      activeProfile,
      dynamicProfile,
      activeManager,
      cart,
      cartItems,
      resolveCartForStore,
      storesForList,
      checkedOff,
      profileId,
      inventory,
      getStock,
      getProductLive,
      productsByStoreLive,
      allProductsLive,
      syncStockFromConnection,
    ],
  )

  if (catalogError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6 text-center">
        <div className="max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-rose-200">
          <p className="text-lg font-semibold text-slate-800">Cannot reach the server</p>
          <p className="mt-2 text-sm text-slate-600">{catalogError}</p>
          <p className="mt-3 text-xs text-slate-500">
            Start the API with <code className="text-brand-600">npm run dev:server</code> (or{' '}
            <code className="text-brand-600">npm run dev</code> for both).
          </p>
        </div>
      </div>
    )
  }

  if (!catalogReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-sm font-medium text-slate-600">Loading store catalog…</p>
      </div>
    )
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>')
  return ctx
}
