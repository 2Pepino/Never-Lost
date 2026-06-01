import { useCallback, useEffect, useState } from 'react'
import { FLOORPLAN_CHANGE_EVENT, getCachedFloorplan, loadFloorplan } from './floorplanStorage.js'

export function useFloorplan(storeId) {
  const [data, setData] = useState(() => {
    const cached = storeId ? getCachedFloorplan(storeId) : null
    const elements = cached?.elements ?? []
    return { elements, hasPlan: elements.length > 0, loading: !cached && !!storeId }
  })

  const refresh = useCallback(async () => {
    if (!storeId) {
      setData({ elements: [], hasPlan: false, loading: false })
      return
    }
    setData((prev) => ({ ...prev, loading: true }))
    const plan = await loadFloorplan(storeId)
    const elements = plan?.elements ?? []
    setData({ elements, hasPlan: elements.length > 0, loading: false })
  }, [storeId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    function onChange(e) {
      const changedId = e?.detail?.storeId
      if (!changedId || changedId === storeId) refresh()
    }
    window.addEventListener(FLOORPLAN_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(FLOORPLAN_CHANGE_EVENT, onChange)
  }, [storeId, refresh])

  return data
}
