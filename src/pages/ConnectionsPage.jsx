import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import { getStore } from '../data/stores.js'
import ManagerHeader from '../components/ManagerHeader.jsx'
import {
  loadConnections,
  saveConnection,
  deleteConnection,
  toggleConnection,
} from '../lib/connectionsStorage.js'
import { sanitizeAuthHeader, sanitizeHttpMethod, validateApiUrl } from '../lib/security.js'

const EMPTY_FORM = {
  id: null,
  name: '',
  baseUrl: '',
  method: 'GET',
  authHeader: '',
  apiKey: '',
  active: true,
  demo: false,
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH']

export default function ConnectionsPage() {
  const { activeManager, isManagerLoggedIn, syncStockFromConnection } = useStore()
  const store = activeManager ? getStore(activeManager.storeId) : null

  const [connections, setConnections] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  // Sync status per connection id: { busy, ok, text }.
  const [syncStatus, setSyncStatus] = useState({})

  async function syncConnection(connection) {
    setSyncStatus((s) => ({ ...s, [connection.id]: { busy: true } }))
    const r = await syncStockFromConnection(store.id, connection.id)
    setSyncStatus((s) => ({
      ...s,
      [connection.id]: {
        busy: false,
        ok: r.ok,
        text: r.ok
          ? `✓ ${r.recognized} products synced (${r.changed} updated)`
          : `✕ ${r.error}`,
      },
    }))
  }

  useEffect(() => {
    if (store) setConnections(loadConnections(store.id))
  }, [store])

  if (!isManagerLoggedIn || !store) return <Navigate to="/manage/login" replace />

  const isEditing = !!form.id

  function start(connection) {
    setError('')
    setForm(connection ? { ...connection } : EMPTY_FORM)
    setShowForm(true)
  }

  function cancel() {
    setShowForm(false)
    setForm(EMPTY_FORM)
    setError('')
  }

  function save(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Give the connection a name.')
      return
    }
    // A demo data source needs no URL; a real API does.
    if (!form.demo) {
      if (!form.baseUrl.trim()) {
        setError('Enter an API URL (or choose a demo data source).')
        return
      }
      const urlCheck = validateApiUrl(form.baseUrl.trim())
      if (!urlCheck.ok) {
        setError(urlCheck.error)
        return
      }
      if (form.authHeader.trim()) {
        const headerName = sanitizeAuthHeader(form.authHeader)
        if (!headerName) {
          setError('The authorization header name contains invalid characters.')
          return
        }
      }
    }
    saveConnection(store.id, {
      ...form,
      name: form.name.trim(),
      baseUrl: form.baseUrl.trim(),
      method: sanitizeHttpMethod(form.method),
      authHeader: form.authHeader.trim() ? sanitizeAuthHeader(form.authHeader.trim()) : '',
    })
    setConnections(loadConnections(store.id))
    cancel()
  }

  function remove(id) {
    deleteConnection(store.id, id)
    setConnections(loadConnections(store.id))
  }

  function toggleActive(id) {
    toggleConnection(store.id, id)
    setConnections(loadConnections(store.id))
  }

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-[#f6f4fc]">
      <ManagerHeader store={store} title="Connections" subtitle={store.name} />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-600">
            Connect your store's database via a custom API and sync the stock, so the
            inventory in the app stays correct.
          </p>
          {!showForm && (
            <button
              type="button"
              onClick={() => start(null)}
              className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              + New connection
            </button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={save}
            className="mb-8 space-y-4 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-800">
              {isEditing ? 'Edit connection' : 'New connection'}
            </h2>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
              <input
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g. Stock system"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div className="grid grid-cols-[7rem_1fr] gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Method</label>
                <select
                  value={form.method}
                  onChange={(e) => setField('method', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">API URL</label>
                <input
                  value={form.baseUrl}
                  onChange={(e) => setField('baseUrl', e.target.value)}
                  placeholder="https://api.example.com/v1/stock"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Auth header (optional)
                </label>
                <input
                  value={form.authHeader}
                  onChange={(e) => setField('authHeader', e.target.value)}
                  placeholder="Authorization"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  API key (optional)
                </label>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setField('apiKey', e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setField('active', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                />
                Connection active
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.demo}
                  onChange={(e) => setField('demo', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                />
                Demo data source (simulated store database — works without a real server)
              </label>
            </div>

            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              This connection fetches the stock from your store's database. Expected JSON:
              a list with per product a <code className="text-brand-600">sku</code> (= product id),{' '}
              <code className="text-brand-600">warehouse</code> and{' '}
              <code className="text-brand-600">shelves</code>. Syncing updates the live
              inventory (visible in the catalog).
            </p>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                {isEditing ? 'Save' : 'Add'}
              </button>
              <button
                type="button"
                onClick={cancel}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {connections.length === 0 && !showForm ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <p className="text-3xl">🔌</p>
            <p className="mt-2 font-medium text-slate-700">No connections yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Add a custom API to connect this system to other systems.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {connections.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
               <div className="flex items-center gap-4">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                    c.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  🔌
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-slate-800">{c.name}</p>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                      {c.method}
                    </span>
                    {!c.active && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                        inactive
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-slate-500">{c.baseUrl}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleActive(c.id)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
                  >
                    {c.active ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => start(c)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
               </div>

                {c.active ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => syncConnection(c)}
                      disabled={syncStatus[c.id]?.busy}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                    >
                      {syncStatus[c.id]?.busy ? 'Syncing…' : '🔄 Sync stock'}
                    </button>
                    {c.demo && (
                      <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-600">
                        demo data source
                      </span>
                    )}
                    {syncStatus[c.id]?.text && (
                      <span
                        className={`text-xs font-medium ${
                          syncStatus[c.id].ok ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {syncStatus[c.id].text}
                      </span>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
