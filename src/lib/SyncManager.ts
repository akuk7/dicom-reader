import { SynchronizerManager } from '@cornerstonejs/tools';
import { Enums, StackViewport } from '@cornerstonejs/core';

const SYNC_KEY = 'zoomSync';
const renderingEngineId = 'myRenderingEngine';

let synchronizer :any= SynchronizerManager.getSynchronizer(SYNC_KEY);
let sharedRenderingEngine: any = null;

export function setRenderingEngine(engine: any) {
  sharedRenderingEngine = engine;
}

export function getRenderingEngine() {
  return sharedRenderingEngine;
}

// Initialize synchronizer if it doesn't exist
function initializeSynchronizer() {
  if (!synchronizer) {
    synchronizer = SynchronizerManager.createSynchronizer(
      SYNC_KEY,
      Enums.Events.CAMERA_MODIFIED,
      (
        event: any,
        sourceViewport: { renderingEngineId: string; viewportId: string },
        targetViewport: { renderingEngineId: string; viewportId: string }
      ) => {
        try {
          if (!sharedRenderingEngine) return;
          
          // Avoid self-sync
          if (targetViewport.viewportId === sourceViewport.viewportId) return;

          const sourceVp = sharedRenderingEngine.getViewport(
            sourceViewport.viewportId
          ) as StackViewport;
          
          const targetVp = sharedRenderingEngine.getViewport(
            targetViewport.viewportId
          ) as StackViewport;

          if (!sourceVp || !targetVp) return;

          // Get camera from source and apply to target
          const sourceCamera = sourceVp.getCamera();
          targetVp.setCamera(sourceCamera);
          
          // Render the target viewport
          sharedRenderingEngine.renderViewports([targetViewport.viewportId]);
        } catch (error) {
          console.warn('Synchronizer callback error:', error);
        }
      }
    );
  }
  return synchronizer;
}


export function addToSync(
  renderingEngineId: string,
  viewportId: string,
  initialCamera?: any
) {
  const sync = initializeSynchronizer();
  if (sync && sharedRenderingEngine) {
    try {
      const viewport = sharedRenderingEngine.getViewport(viewportId);
      if (viewport) {
        sync.addSource({ renderingEngineId, viewportId });
        sync.addTarget({ renderingEngineId, viewportId });

        // 🔹 If an initial camera is given, set it immediately
        if (initialCamera) {
          (viewport as StackViewport).setCamera(initialCamera);
          sharedRenderingEngine.renderViewports([viewportId]);
        }
      }
    } catch (error) {
      console.warn('Error adding to sync:', error);
    }
  }
}


export function removeFromSync(renderingEngineId: string, viewportId: string) {
  const sync = initializeSynchronizer();
  if (sync) {
    try {
      sync.remove({ renderingEngineId, viewportId });
    } catch (error) {
      console.warn('Error removing from sync:', error);
    }
  }
}

// Clean up synchronizer
export function destroySynchronizer() {
  if (synchronizer) {
    try {
      SynchronizerManager.destroySynchronizer(SYNC_KEY);
      synchronizer = null
    } catch (error) {
      console.warn('Error destroying synchronizer:', error);
    }
  }
}

// Get all synced viewports
export function getSyncedViewports() {
  const sync = initializeSynchronizer();
  if (sync) {
    return {
      sources: (sync as any).sourceViewports || [],
      targets: (sync as any).targetViewports || []
    };
  }
  return { sources: [], targets: [] };
}