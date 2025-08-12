export type SyncCallback = (zoomValue: number, sourceViewerId: string) => void

class SyncManagerClass {
  private viewers: Map<string, SyncCallback> = new Map()

  addViewer(viewerId: string, callback?: SyncCallback) {
    if (callback) {
      this.viewers.set(viewerId, callback)
    }
  }

  removeViewer(viewerId: string) {
    this.viewers.delete(viewerId)
  }

  syncZoom(zoomValue: number, sourceViewerId: string) {
    if (!this.viewers.has(sourceViewerId)) {
      return
    }

    this.viewers.forEach((callback, viewerId) => {
      if (viewerId !== sourceViewerId) {
        try {
          callback(zoomValue, sourceViewerId)
        } catch (error) {
          // Error is expected if a viewer is removed while syncing
        }
      }
    })
  }

  getSyncedViewers(): string[] {
    return Array.from(this.viewers.keys())
  }

  isSynced(viewerId: string): boolean {
    return this.viewers.has(viewerId)
  }

  clear() {
    this.viewers.clear()
  }
}

export const SyncManager = new SyncManagerClass()