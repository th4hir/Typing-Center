import { useState, useCallback } from 'react'

export function useTableColumns(storageKey, defaultCols, friendlyNames) {
  const [colOrder, setColOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_order`)
      return saved ? JSON.parse(saved) : defaultCols
    } catch {
      return defaultCols
    }
  })

  const [colVisible, setColVisible] = useState(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}_visible`)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Ensure new columns are tracked if defaults expand
        defaultCols.forEach(col => {
          if (parsed[col] === undefined) {
            parsed[col] = true
          }
        })
        return parsed
      }
    } catch {}
    const initial = {}
    defaultCols.forEach(col => {
      initial[col] = true
    })
    return initial
  })

  const toggleColumn = useCallback((col) => {
    setColVisible(prev => {
      const updated = { ...prev, [col]: !prev[col] }
      localStorage.setItem(`${storageKey}_visible`, JSON.stringify(updated))
      return updated
    })
  }, [storageKey])

  const handleDragStart = useCallback((e, index) => {
    e.dataTransfer.setData('colIndex', String(index))
  }, [])

  const handleDrop = useCallback((e, destIndex) => {
    const srcIndex = parseInt(e.dataTransfer.getData('colIndex'), 10)
    if (isNaN(srcIndex) || srcIndex === destIndex) return
    setColOrder(prev => {
      const newOrder = [...prev]
      const [removed] = newOrder.splice(srcIndex, 1)
      newOrder.splice(destIndex, 0, removed)
      localStorage.setItem(`${storageKey}_order`, JSON.stringify(newOrder))
      return newOrder
    })
  }, [storageKey])

  return {
    colOrder,
    colVisible,
    toggleColumn,
    handleDragStart,
    handleDrop,
    friendlyNames
  }
}
