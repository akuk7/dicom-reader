import React, { useEffect, useRef, useState } from 'react';
import { 
  init as cs3DInit, 
  RenderingEngine, 
  imageLoader
} from '@cornerstonejs/core';
import { init as dicomLoaderInit } from '@cornerstonejs/dicom-image-loader';
import { init as cornerstoneToolsInit } from '@cornerstonejs/tools';
import Viewer from './Viewer';
import { setRenderingEngine, destroySynchronizer } from './lib/SyncManager';

const renderingEngineId = 'myRenderingEngine';
const DEFAULT_IMAGE_ID =
  'wadouri:https://edu-next-app.s3.ap-southeast-2.amazonaws.com/dicom-image.dcm';
const DEFAULT_ZOOM = 1.0;

interface ViewerState {
  id: string;
  zoom: number;
  sync: boolean;
}

const STORAGE_KEY = 'multiViewerState';

function isPageReload(): boolean {
  try {
    const navEntries = performance.getEntriesByType('navigation') as any[];
    if (navEntries && navEntries.length > 0) {
      return navEntries[0]?.type === 'reload';
    }
    const legacy = (performance as any).navigation?.type;
    return legacy === 1;
  } catch {
    return false;
  }
}

function loadState(): ViewerState[] {
  try {
    const fromSession = sessionStorage.getItem(STORAGE_KEY);
    if (fromSession) {
      return JSON.parse(fromSession) as ViewerState[];
    }
  } catch {}

  try {
    if (isPageReload()) {
      const fromLocal = localStorage.getItem(STORAGE_KEY);
      if (fromLocal) {
        sessionStorage.setItem(STORAGE_KEY, fromLocal);
        return JSON.parse(fromLocal) as ViewerState[];
      }
    }
  } catch {}

  return [{ id: 'v1', zoom: DEFAULT_ZOOM, sync: false }];
}

function saveState(state: ViewerState[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save state:', error);
  }
}

const Home: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [viewers, setViewers] = useState<ViewerState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const renderingEngineRef = useRef<RenderingEngine | null>(null);
  const initializingRef = useRef(false);

  useEffect(() => {
    async function initialize() {
      if (initializingRef.current) return;
      initializingRef.current = true;

      try {
        await cs3DInit();
        await dicomLoaderInit({
          maxWebWorkers: navigator.hardwareConcurrency || 1,
          strict: false,
        });
        await cornerstoneToolsInit();
        const engine = new RenderingEngine(renderingEngineId);
        renderingEngineRef.current = engine;
        setRenderingEngine(engine);
        try {
          await imageLoader.loadAndCacheImage(DEFAULT_IMAGE_ID);
        } catch (imgError) {
          console.warn('Failed to pre-load image:', imgError);
        }

        setIsReady(true);
        setError(null);
        
      } catch (err) {
        console.error('Initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setIsReady(false);
      } finally {
        initializingRef.current = false;
      }
    }

    initialize();

    return () => {
      if (renderingEngineRef.current) {
        try {
          renderingEngineRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying rendering engine:', error);
        }
      }
      destroySynchronizer();
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      setViewers(loadState());
    }
  }, [isReady]);

  useEffect(() => {
    if (isReady && viewers.length > 0) {
      saveState(viewers);
    }
  }, [viewers, isReady]);

  const addViewer = () => {
    const newId = `v${Date.now()}`;
    setViewers((prev) => [
      ...prev,
      { id: newId, zoom: DEFAULT_ZOOM, sync: false },
    ]);
  };

  const removeViewer = (index: number) => {
    setViewers((prev) => prev.filter((_, i) => i !== index));
  };

  // const updateViewer = (index: number, data: Partial<ViewerState>) => {
  //   setViewers((prev) =>
  //     prev.map((v, i) => (i === index ? { ...v, ...data } : v))
  //   );
  // };
  const updateViewer = (index: number, data: Partial<ViewerState>) => {
    setViewers((prev) => {
      const updated = prev.map((v, i) => (i === index ? { ...v, ...data } : v));
  
      // If sync just got enabled for this viewer
      if (data.sync === true && prev[index].sync === false) {
        const renderingEngine = renderingEngineRef.current;
        if (renderingEngine) {
          // Defer camera sync to the next frame to avoid race
          requestAnimationFrame(() => {
            try {
              // Find another synced viewport
              const syncedList = updated
                .filter((v, i2) => i2 !== index && v.sync)
                .map(v => v.id);
  
              if (syncedList.length > 0) {
                const refVp = renderingEngine.getViewport(syncedList[0]);
                const currentVp = renderingEngine.getViewport(prev[index].id);
                if (refVp && currentVp) {
                  currentVp.setCamera(refVp.getCamera());
                  renderingEngine.renderViewports([prev[index].id]);
                }
              }
            } catch (err) {
              console.warn('Failed to match camera after sync enable:', err);
            }
          });
        }
      }
  
      return updated;
    });
  };
  

  if (error) {
    return (
      <div style={{ padding: 20, color: 'red' }}>
        <h2>Initialization Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Reload Page
        </button>
      </div>
    );
  }

  if (!isReady || !renderingEngineRef.current) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Loading DICOM Viewer...</h2>
        <p>Initializing Cornerstone3D and DICOM loader...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>DICOM Multi-Viewer (Cornerstone3D with Tools)</h2>
      <div style={{ marginBottom: 16 }}>
        <button onClick={addViewer} style={{ marginRight: 8 }}>
          Add Viewer
        </button>
        <span style={{ color: '#666', fontSize: 14 }}>
          Viewers: {viewers.length} | 
          Synced: {viewers.filter(v => v.sync).length}
        </span>
      </div>
      
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginTop: 16,
        }}
      >
        {viewers.map((viewer, i) => (
          <Viewer
            key={viewer.id}
            imageId={DEFAULT_IMAGE_ID}
            viewportId={viewer.id}
            zoom={viewer.zoom}
            sync={viewer.sync}
            renderingEngine={renderingEngineRef.current!}
            onZoomChange={(z) => updateViewer(i, { zoom: z })}
            onSyncChange={(s) => updateViewer(i, { sync: s })}
            onRemove={() => removeViewer(i)}
          />
        ))}
      </div>
      
      {viewers.length === 0 && (
        <div style={{ 
          padding: 20, 
          textAlign: 'center', 
          color: '#666',
          border: '2px dashed #ccc',
          borderRadius: 8,
          marginTop: 16
        }}>
          No viewers yet. Click "Add Viewer" to get started.
        </div>
      )}
    </div>
  );
};

export default Home;