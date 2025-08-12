import React, { useState, useCallback, useEffect } from 'react'
import Viewer from './Viewer'
import { SyncManager } from './lib/SyncManager'

interface ViewerInstance {
  id: string
  syncEnabled: boolean
}

function App() {
  const [viewers, setViewers] = useState<ViewerInstance[]>([
    { id: 'viewer-1', syncEnabled: false }
  ])
  const [columns, setColumns] = useState<number>(() => (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 2 : 1))

  useEffect(() => {
    const handleResize = () => setColumns(window.innerWidth >= 1024 ? 2 : 1)
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const addViewer = useCallback(() => {
    const newId = `viewer-${Date.now()}`
    setViewers(prev => [...prev, { id: newId, syncEnabled: false }])
  }, [])

  const removeViewer = useCallback((viewerId: string) => {
    if (viewers.length <= 1) return
    
    setViewers(prev => {
      const updated = prev.filter(v => v.id !== viewerId)
      SyncManager.removeViewer(viewerId)
      return updated
    })
  }, [viewers.length])

  const toggleSync = useCallback((viewerId: string) => {
    setViewers(prev => prev.map(viewer => {
      if (viewer.id === viewerId) {
        const updated = { ...viewer, syncEnabled: !viewer.syncEnabled }
        
        if (updated.syncEnabled) {
          SyncManager.addViewer(viewerId)
        } else {
          SyncManager.removeViewer(viewerId)
        }
        
        return updated
      }
      return viewer
    }))
  }, [])

  return (
    <div className="p-5 font-sans w-[100vw] min-h-screen bg-gray-100">
      <div className="mb-5 flex gap-2.5 items-center">
        <h1 className="m-0 text-gray-800">DICOM Multi-Viewer</h1>
        <button
          onClick={addViewer}
          className="px-5 py-2.5 bg-blue-500 text-white border-none rounded-md cursor-pointer text-sm font-bold hover:bg-blue-600 transition-colors"
        >
          + Add Viewer
        </button>
        <span className="text-gray-600 text-sm">
          {viewers.length} viewer{viewers.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid gap-5 max-h-[calc(100vh-120px)] overflow-y-auto p-2.5" style={{gridTemplateColumns: columns === 2 ? 'repeat(2, minmax(0, 1fr))' : '1fr'}}>
        {viewers.map((viewer) => (
          <div
            key={viewer.id}
            className="bg-white rounded-lg p-4 shadow-md relative"
          >
            <div className="flex justify-between items-center mb-2.5">
              <h3 className="m-0 text-base text-gray-800 font-normal">
                {viewer.id}
              </h3>
              
              <div className="flex gap-2.5 items-center">
                <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={viewer.syncEnabled}
                    onChange={() => toggleSync(viewer.id)}
                    className="cursor-pointer"
                  />
                  Sync Zoom
                </label>
                
                {viewers.length > 1 && (
                  <button
                    onClick={() => removeViewer(viewer.id)}
                    className="px-2.5 py-1.5 bg-red-600 text-white border-none rounded-md cursor-pointer text-xs hover:bg-red-700 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            
            <Viewer 
              key={viewer.id}
              viewerId={viewer.id}
              syncEnabled={viewer.syncEnabled}
            />
          </div>
        ))}
      </div>
      
      {viewers.length === 0 && (
        <div className="text-center p-12 text-gray-600">
          No viewers available. Click "Add Viewer" to get started.
        </div>
      )}
    </div>
  )
}

export default App