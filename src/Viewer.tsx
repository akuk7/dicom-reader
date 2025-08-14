import React, { useEffect, useRef, useState, useCallback } from 'react';
import { addToSync, getSyncedViewports, removeFromSync } from './lib/SyncManager';
import { Enums, StackViewport, RenderingEngine, imageLoader } from '@cornerstonejs/core';
import { ToolGroupManager, ZoomTool, PanTool, addTool, Enums as csToolsEnums } from '@cornerstonejs/tools';

const renderingEngineId = 'myRenderingEngine';
const TOOL_GROUP_ID = 'VIEWER_TOOL_GROUP';

export interface ViewerProps {
  imageId: string;
  viewportId: string;
  zoom: number;
  sync: boolean;
  renderingEngine: RenderingEngine;
  onZoomChange: (zoom: number) => void;
  onSyncChange: (synced: boolean) => void;
  onRemove: () => void;
}

const Viewer: React.FC<ViewerProps> = ({
  imageId,
  viewportId,
  zoom: initialZoom,
  sync,
  renderingEngine,
  onZoomChange,
  onSyncChange,
  onRemove,
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(initialZoom);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const viewportEnabledRef = useRef(false);
  const cameraListenerRef = useRef<null | { remove: () => void }>(null);

  const cleanup = useCallback(() => {
    try {
      try { cameraListenerRef.current?.remove(); cameraListenerRef.current = null; } catch {}
      removeFromSync(renderingEngineId, viewportId);

      const toolGroupId = `${TOOL_GROUP_ID}-${viewportId}`;
      try {
        ToolGroupManager.destroyToolGroup(toolGroupId);
      } catch (error) {
      }

      if (renderingEngine && viewportEnabledRef.current) {
        try {
          renderingEngine.disableElement(viewportId);
          viewportEnabledRef.current = false;
        } catch (error) {
          console.warn('Error disabling element:', error);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }, [renderingEngine, viewportId]);

  useEffect(() => {
    if (!renderingEngine || !divRef.current ) return;

    mountedRef.current = true;
    setIsLoading(true);
    setError(null);

    const setupViewport = async () => {
      try {
        try {
          addTool(ZoomTool);
          addTool(PanTool);
        } catch (error) {
          console.debug('Tools already registered');
        }

        const toolGroupId = `${TOOL_GROUP_ID}-${viewportId}`;
        try { ToolGroupManager.destroyToolGroup(toolGroupId); } catch {}
        const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

        try { addTool(ZoomTool); } catch {}
        try { addTool(PanTool); } catch {}
        if (toolGroup) {
          try { toolGroup.addTool(ZoomTool.toolName); } catch {}
          try { toolGroup.addTool(PanTool.toolName); } catch {}
        }

        if (!mountedRef.current || !divRef.current) return;

        if (viewportEnabledRef.current) {
          try {
            renderingEngine.disableElement(viewportId);
          } catch (error) {
            console.debug('Element was not enabled or already disabled');
          }
        }

        renderingEngine.enableElement({
          element: divRef.current,
          viewportId,
          type: Enums.ViewportType.STACK,
          defaultOptions: {
            background: [0, 0, 0],
          },
        });

        viewportEnabledRef.current = true;

        if (!mountedRef.current) {
          cleanup();
          return;
        }

        const viewport = renderingEngine.getViewport(viewportId) as StackViewport;
        if (!viewport) {
          throw new Error('Failed to get viewport after enabling element');
        }

        await imageLoader.loadAndCacheImage(imageId);

        if (!mountedRef.current) {
          cleanup();
          return;
        }

        const currentViewport = renderingEngine.getViewport(viewportId) as StackViewport;
        if (!currentViewport) {
          throw new Error('Viewport became invalid during setup');
        }

        await currentViewport.setStack([imageId], 0);

        currentViewport.setZoom(initialZoom);
        setZoom(initialZoom);
        onZoomChange(initialZoom);

        try {
          const element = divRef.current;
          if (element) {
            const onCameraChanged = () => {
              try {
                const z = currentViewport.getZoom();
                setZoom((prev) => (Math.abs(prev - z) > 0.005 ? z : prev));
                onZoomChange(z);
              } catch {}
            };
            element.addEventListener(Enums.Events.CAMERA_MODIFIED as unknown as string, onCameraChanged as EventListener);
            cameraListenerRef.current = {
              remove: () => {
                try { element.removeEventListener(Enums.Events.CAMERA_MODIFIED as unknown as string, onCameraChanged as EventListener); } catch {}
              },
            };
          }
        } catch {}

        if (toolGroup) {
          try {
            (toolGroup as any).addViewport(viewportId);
          } catch {
            (toolGroup as any).addViewport(renderingEngineId, viewportId);
          }

          try {
            toolGroup.setToolActive(ZoomTool.toolName, {
              bindings: [
                { mouseButton: csToolsEnums.MouseBindings.Wheel },
                { mouseButton: csToolsEnums.MouseBindings.Secondary },
              ],
            });
          } catch {}
          try {
            toolGroup.setToolActive(PanTool.toolName, {
              bindings: [
                { mouseButton: csToolsEnums.MouseBindings.Primary },
              ],
            });
          } catch {}
        }

        renderingEngine.renderViewports([viewportId]);

        setIsLoading(false);
        setError(null);

      } catch (err) {
        console.error(`Setup error for viewport ${viewportId}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to setup viewport');
        setIsLoading(false);
        
        if (mountedRef.current) {
          cleanup();
        }
      }
    };

    setupViewport();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [imageId, viewportId, renderingEngine, cleanup]);

 
  useEffect(() => {
    if (!mountedRef.current || isLoading) return;
    
    try {
      if (sync) {
        addToSync(renderingEngineId, viewportId);
     
      
      } else {
        removeFromSync(renderingEngineId, viewportId);
      }
    } catch (error) {
      console.warn('Error updating sync:', error);
    }
  }, [sync, viewportId, isLoading]);

  const handleRemove = () => {
    mountedRef.current = false;
    onRemove();
  };

  return (
    <div style={{ border: '1px solid #aaa', padding: 8, margin: 8 }}>
      <div
        ref={divRef}
        style={{ 
          width: 400, 
          height: 400, 
          backgroundColor: 'black',
          position: 'relative'
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50vh',
              left: '50vw',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              fontSize: 12,
              pointerEvents: 'none',
            }}
          >
            Loading...
          </div>
        )}
        {error && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'red',
              fontSize: 10,
              padding: 4,
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {error}
          </div>
        )}
        {sync && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(54, 60, 56, 0.8)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            SYNC
          </div>
        )}
      </div>
      <div style={{ fontSize: 16, marginTop: 4,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:10 }}>

        <div>
          Zoom: {zoom.toFixed(2)}x
          {isLoading && ' (Loading...)'}
        </div>
        <label style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <input
            type="checkbox"
            checked={sync}
            onChange={(e) => onSyncChange(e.target.checked)}
            disabled={isLoading}
          />
          <span style={{ marginLeft: 4 }}>Sync Zoom</span>
        </label>
        </div>
        <button 
          style={{ marginTop: 4, fontSize: 14 }} 
          onClick={handleRemove}
          disabled={isLoading}
        >
          Remove
        </button>
      </div>
    </div>
  );
};

export default Viewer;