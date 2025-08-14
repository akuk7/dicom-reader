import { useEffect, useRef, useState } from "react"
import createImageIdsAndCacheMetaData from "./lib/createImageIdsAndCacheMetaData"
import { RenderingEngine, Enums, init as coreInit, eventTarget, EVENTS } from "@cornerstonejs/core"
import { init as dicomImageLoaderInit } from "@cornerstonejs/dicom-image-loader"
import { init as csToolsInit, ToolGroupManager, ZoomTool, PanTool, Enums as csToolsEnums, addTool } from "@cornerstonejs/tools"
import { SyncManager, type SyncCallback } from "./lib/OldSyncManager"

interface ViewerProps {
  viewerId: string
  syncEnabled: boolean
}

function OldViewer({ viewerId, syncEnabled }: ViewerProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const running = useRef(false)
  const viewportRef = useRef<any>(null)
  const renderingEngineRef = useRef<RenderingEngine | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const syncListenerRef = useRef<SyncCallback | null>(null)

  useEffect(() => {
    const setup = async () => {
      if (running.current) return
      running.current = true
      
      // Initialize Cornerstone (these are safe to call multiple times)
      await coreInit()
      await csToolsInit()
      await dicomImageLoaderInit({maxWebWorkers: 1})

      const imageIds = await createImageIdsAndCacheMetaData('https://edu-next-app.s3.ap-southeast-2.amazonaws.com/dicom-image.dcm')

      const renderingEngineId = `renderingEngine-${viewerId}`
      const renderingEngine = new RenderingEngine(renderingEngineId)
      renderingEngineRef.current = renderingEngine
      
      const viewportInput = {
        viewportId: viewerId,
        type: Enums.ViewportType.STACK,
        element: elementRef.current!,
      }

      renderingEngine.enableElement(viewportInput)
      const viewport = renderingEngine.getViewport(viewerId) as any
      viewportRef.current = viewport
      viewport.setStack(imageIds, 0)
      viewport.render()

      const updateZoomLevel = () => {
        try {
          const zoom = viewport.getZoom()
          setZoomLevel(Math.round(zoom * 100) / 100)
        } catch (error) {
          console.error('Error getting zoom level:', error)
        }
      }

      updateZoomLevel()

      // Set up zoom sync listener
      const onSyncZoom = (zoomValue: number, sourceViewerId: string) => {
        if (sourceViewerId !== viewerId && viewportRef.current) {
          try {
            const currentZoom = viewportRef.current.getZoom()
            if (Math.abs(currentZoom - zoomValue) > 0.01) {
              viewportRef.current.setZoom(zoomValue)
              viewportRef.current.render()
              setZoomLevel(Math.round(zoomValue * 100) / 100)
            }
          } catch (error) {
            console.error('Error syncing zoom:', error)
          }
        }
      }
      syncListenerRef.current = onSyncZoom

      // Set up tools
      setTimeout(() => {
        try {
          const toolGroupId = `toolGroup-${viewerId}`
          
          // Remove existing tool group if it exists
          try {
            ToolGroupManager.destroyToolGroup(toolGroupId)
          } catch (e) {
            // Tool group doesn't exist, which is fine
          }
          
          const toolGroup = ToolGroupManager.createToolGroup(toolGroupId)
          
          if (toolGroup) {
            // Add tools (safe to call multiple times)
            try {
              addTool(ZoomTool)
              addTool(PanTool)
            } catch (e) {
              // Tools already added, which is fine
            }
            
            toolGroup.addTool(ZoomTool.toolName)
            toolGroup.addTool(PanTool.toolName)
            toolGroup.addViewport(viewerId)

            toolGroup.setToolActive(ZoomTool.toolName, {
              bindings: [
                { mouseButton: csToolsEnums.MouseBindings.Secondary },
                { mouseButton: csToolsEnums.MouseBindings.Wheel },
              ],
            })

            toolGroup.setToolActive(PanTool.toolName, {
              bindings: [
                { mouseButton: csToolsEnums.MouseBindings.Primary },
              ],
            })

            console.log(`Tools setup complete for ${viewerId}`)
            updateZoomLevel()
          }
          
          viewport.render()
        } catch (error) {
          console.error('Error setting up tools:', error)
        }
      }, 500)

      // Add zoom change listener for sync
      const canvas = elementRef.current?.querySelector('canvas')
      if (canvas) {
        const handleWheel = () => {
          setTimeout(() => {
            updateZoomLevel()
            // Check sync status at the time of the event
            const isCurrentlySynced = SyncManager.isSynced(viewerId)
            if (isCurrentlySynced && viewportRef.current) {
              try {
                const currentZoom = viewportRef.current.getZoom()
                console.log(`Broadcasting zoom ${currentZoom} from ${viewerId}`)
                SyncManager.syncZoom(currentZoom, viewerId)
              } catch (error) {
                console.error('Error broadcasting zoom:', error)
              }
            }
          }, 50)
        }
        
        const handleMouseMove = () => {
          // Also handle mouse drag zoom (right-click drag)
          setTimeout(() => {
            updateZoomLevel()
            const isCurrentlySynced = SyncManager.isSynced(viewerId)
            if (isCurrentlySynced && viewportRef.current) {
              try {
                const currentZoom = viewportRef.current.getZoom()
                SyncManager.syncZoom(currentZoom, viewerId)
              } catch (error) {
                console.error('Error broadcasting zoom:', error)
              }
            }
          }, 100)
        }
        
        canvas.addEventListener('wheel', handleWheel)
        canvas.addEventListener('mouseup', handleMouseMove)
        
        // Store cleanup function
        ;(viewport as any)._cleanupZoomListener = () => {
          canvas.removeEventListener('wheel', handleWheel)
          canvas.removeEventListener('mouseup', handleMouseMove)
        }
      }
    }

    setup()

    return () => {
      // Cleanup
      if (viewportRef.current && (viewportRef.current as any)._cleanupZoomListener) {
        ;(viewportRef.current as any)._cleanupZoomListener()
      }
      
      if (renderingEngineRef.current) {
        try {
          renderingEngineRef.current.destroy()
        } catch (error) {
          console.error('Error destroying rendering engine:', error)
        }
      }
      
      // Clean up tool group
      try {
        const toolGroupId = `toolGroup-${viewerId}`
        ToolGroupManager.destroyToolGroup(toolGroupId)
      } catch (error) {
        // Tool group might not exist
      }
      
      // Remove from sync manager
      SyncManager.removeViewer(viewerId)
    }
  }, [viewerId])

  // Handle sync enable/disable
  useEffect(() => {
    if (syncEnabled && syncListenerRef.current) {
      SyncManager.addViewer(viewerId, syncListenerRef.current)
    } else {
      SyncManager.removeViewer(viewerId)
    }
  }, [syncEnabled, viewerId])

  return (
    <div className="relative inline-block">
      <div
        ref={elementRef}
        className="w-[512px] h-[512px] bg-black border-2 border-gray-700 cursor-crosshair"
        onContextMenu={(e) => e.preventDefault()}
      ></div>
      <div
        className="absolute top-2.5 right-2.5 bg-gray-900 bg-opacity-70 text-white px-3 py-2 rounded-md text-sm font-mono z-1000"
      >
        Zoom: {zoomLevel}x
      </div>
      {syncEnabled && (
        <div
          className="absolute top-2.5 left-2.5 bg-green-600 bg-opacity-80 text-white px-3 py-2 rounded-md text-sm font-mono z-1000"
        >
          SYNC
        </div>
      )}
    </div>
  )
}

export default OldViewer