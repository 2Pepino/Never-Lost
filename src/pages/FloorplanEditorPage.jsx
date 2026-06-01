import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import { getStore } from '../data/stores.js'
import { getFloorplanType } from '../data/floorplanTypes.js'
import { loadFloorplan, saveFloorplan } from '../lib/floorplanStorage.js'
import { normalizeElement } from '../lib/floorplanGeometry.js'
import ElementPalette from '../components/floorplan/ElementPalette.jsx'
import EditorCanvas from '../components/floorplan/EditorCanvas.jsx'
import EditorPropertiesPanel from '../components/floorplan/EditorPropertiesPanel.jsx'
import FloorplanRenderer from '../components/floorplan/FloorplanRenderer.jsx'
import ManagerHeader from '../components/ManagerHeader.jsx'
import { productsByStore, categoriesForStore } from '../data/products.js'

export default function FloorplanEditorPage() {
  const { activeManager, isManagerLoggedIn, managerLogout } = useStore()
  const store = activeManager ? getStore(activeManager.storeId) : null

  const [elements, setElements] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [saved, setSaved] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [loadError, setLoadError] = useState('')
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!store) return
    let cancelled = false
    loadedRef.current = false
    setLoadError('')
    loadFloorplan(store.id)
      .then((stored) => {
        if (cancelled) return
        setElements((stored?.elements || []).map(normalizeElement))
        loadedRef.current = true
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the floor plan from the server.')
      })
    return () => {
      cancelled = true
    }
  }, [store])

  useEffect(() => {
    if (!store || !loadedRef.current) return
    const timer = setTimeout(() => {
      saveFloorplan(store.id, elements)
        .then(() => {
          setSaved(true)
          setTimeout(() => setSaved(false), 1500)
        })
        .catch(() => setLoadError('Could not save the floor plan.'))
    }, 400)
    return () => clearTimeout(timer)
  }, [store, elements])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'r' || e.key === 'R') {
        if (!selectedId) return
        setElements((els) =>
          els.map((el) => {
            if (el.id !== selectedId) return el
            const def = getFloorplanType(el.type)
            if (!def?.rotatable) return el
            const current = Number(el.rotation) || 0
            return normalizeElement({ ...el, rotation: (current + 90) % 360 })
          }),
        )
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])

  if (!isManagerLoggedIn) return <Navigate to="/manage/login" replace />
  if (!store) return <Navigate to="/manage/login" replace />

  const selected = elements.find((el) => el.id === selectedId)
  const storeCategories = useMemo(
    () => (store ? categoriesForStore(store.id) : []),
    [store],
  )

  function rotateElement(elId) {
    setElements((els) =>
      els.map((el) => {
        if (el.id !== elId) return el
        const def = getFloorplanType(el.type)
        if (!def?.rotatable) return el
        const current = Number(el.rotation) || 0
        return normalizeElement({ ...el, rotation: (current + 90) % 360 })
      }),
    )
  }

  function deleteSelected() {
    if (!selectedId) return
    setElements((els) => els.filter((el) => el.id !== selectedId))
    setSelectedId(null)
  }

  function handleLabelChange(elId, label) {
    setElements((els) => els.map((el) => (el.id === elId ? { ...el, label } : el)))
  }

  function handleSizeChange(elId, { w, h }) {
    setElements((els) =>
      els.map((el) => (el.id === elId ? normalizeElement({ ...el, w, h }) : el)),
    )
  }

  function handleStyleChange(elId, patch) {
    setElements((els) =>
      els.map((el) => (el.id === elId ? normalizeElement({ ...el, ...patch }) : el)),
    )
  }

  return (
    <div className="manage-layout flex flex-col bg-[#f6f4fc]">
      <ManagerHeader
        store={store}
        title="Edit floor plan"
        subtitle={
          <>
            {store.name}
            {saved && <span className="ml-2 text-emerald-600">· saved</span>}
          </>
        }
        onLogout={() => {
          void saveFloorplan(store.id, elements).finally(() => managerLogout())
        }}
      >
        {selected && getFloorplanType(selected.type)?.rotatable && (
          <button
            type="button"
            onClick={() => rotateElement(selected.id)}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
          >
            ↻ Rotate (90°)
          </button>
        )}
        {selected && (
          <button
            type="button"
            onClick={deleteSelected}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Preview
        </button>
      </ManagerHeader>

      {loadError && (
        <p className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-center text-sm text-rose-700">
          {loadError}
        </p>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ElementPalette />
        <EditorCanvas
          elements={elements}
          onChange={setElements}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRotate={rotateElement}
          snapEnabled={snapEnabled}
        />
        <EditorPropertiesPanel
          selected={selected}
          categories={storeCategories}
          snapEnabled={snapEnabled}
          onSnapToggle={setSnapEnabled}
          onLabelChange={handleLabelChange}
          onSizeChange={handleSizeChange}
          onStyleChange={handleStyleChange}
        />
      </div>

      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-8"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#f6f4fc] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-center text-sm font-semibold text-slate-600">
              This is how customers see your floor plan (mobile)
            </p>
            <p className="mb-3 text-center text-[11px] text-slate-400">
              Give each shelf a category from your assortment (e.g. cat1, cat2) so routes are correct.
            </p>
            <FloorplanRenderer
              elements={elements}
              products={productsByStore(store.id)}
              className="aspect-[100/104] w-full rounded-2xl bg-white shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="mt-4 w-full rounded-full bg-brand-600 py-2.5 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
