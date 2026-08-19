// IndexedDB & LocalStorage Local-First Persistence Engine for Farm Operations

const DB_NAME = 'AgroVet_Farm_DB';
const DB_VERSION = 1;
const STORE_DATA = 'farm_store';
const STORE_QUEUE = 'sync_queue';

export interface SyncQueueItem {
  id: string;
  key: string;
  data: any;
  timestamp: number;
}

class LocalDatabase {
  private dbPromise: Promise<IDBDatabase | null>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_DATA)) {
            db.createObjectStore(STORE_DATA, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(STORE_QUEUE)) {
            db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (err) => {
          console.warn('[LocalDB] IndexedDB open error, falling back to LocalStorage:', err);
          resolve(null);
        };
      } catch (e) {
        console.warn('[LocalDB] IndexedDB not available, fallback to LocalStorage:', e);
        resolve(null);
      }
    });
  }

  // Get data by key
  async get<T>(key: string, defaultVal: T): Promise<T> {
    try {
      const db = await this.dbPromise;
      if (db) {
        return new Promise<T>((resolve) => {
          try {
            const tx = db.transaction(STORE_DATA, 'readonly');
            const store = tx.objectStore(STORE_DATA);
            const req = store.get(key);

            req.onsuccess = () => {
              if (req.result && req.result.data !== undefined) {
                resolve(req.result.data as T);
              } else {
                // Check localStorage fallback
                const lsData = this.getFromLocalStorage<T>(key);
                resolve(lsData !== null ? lsData : defaultVal);
              }
            };

            req.onerror = () => {
              const lsData = this.getFromLocalStorage<T>(key);
              resolve(lsData !== null ? lsData : defaultVal);
            };
          } catch (e) {
            const lsData = this.getFromLocalStorage<T>(key);
            resolve(lsData !== null ? lsData : defaultVal);
          }
        });
      } else {
        const lsData = this.getFromLocalStorage<T>(key);
        return lsData !== null ? lsData : defaultVal;
      }
    } catch (e) {
      console.warn(`[LocalDB] Error reading key "${key}":`, e);
      const lsData = this.getFromLocalStorage<T>(key);
      return lsData !== null ? lsData : defaultVal;
    }
  }

  // Set data by key
  async set<T>(key: string, data: T): Promise<void> {
    // 1. Always save to LocalStorage immediately for instant synchronous recovery
    this.saveToLocalStorage(key, data);

    // 2. Also persist to IndexedDB
    try {
      const db = await this.dbPromise;
      if (db) {
        return new Promise<void>((resolve) => {
          try {
            const tx = db.transaction(STORE_DATA, 'readwrite');
            const store = tx.objectStore(STORE_DATA);
            store.put({ key, data, updatedAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          } catch (e) {
            resolve();
          }
        });
      }
    } catch (e) {
      console.warn(`[LocalDB] Error saving to IndexedDB for key "${key}":`, e);
    }
  }

  // Add mutation to sync queue when offline
  async enqueueSync(key: string, data: any): Promise<number> {
    const item: SyncQueueItem = {
      id: `${key}_${Date.now()}`,
      key,
      data,
      timestamp: Date.now()
    };

    // Update queue in localStorage
    const currentQueue = this.getQueueFromLocalStorage();
    // Replace any existing pending item with the same key to avoid duplicate pushes
    const filteredQueue = currentQueue.filter(q => q.key !== key);
    filteredQueue.push(item);
    this.saveQueueToLocalStorage(filteredQueue);

    try {
      const db = await this.dbPromise;
      if (db) {
        const tx = db.transaction(STORE_QUEUE, 'readwrite');
        const store = tx.objectStore(STORE_QUEUE);
        store.put(item);
      }
    } catch (e) {
      // Ignored, localStorage is updated
    }

    return filteredQueue.length;
  }

  // Get all pending sync items
  async getPendingQueue(): Promise<SyncQueueItem[]> {
    const lsQueue = this.getQueueFromLocalStorage();
    try {
      const db = await this.dbPromise;
      if (db) {
        return new Promise<SyncQueueItem[]>((resolve) => {
          try {
            const tx = db.transaction(STORE_QUEUE, 'readonly');
            const store = tx.objectStore(STORE_QUEUE);
            const req = store.getAll();
            req.onsuccess = () => {
              const dbQueue = req.result || [];
              // Merge and deduplicate by key
              const map = new Map<string, SyncQueueItem>();
              [...lsQueue, ...dbQueue].forEach(item => map.set(item.key, item));
              resolve(Array.from(map.values()));
            };
            req.onerror = () => resolve(lsQueue);
          } catch (e) {
            resolve(lsQueue);
          }
        });
      }
    } catch (e) {
      return lsQueue;
    }
    return lsQueue;
  }

  // Remove specific item from sync queue after successful sync
  async removeQueueItem(id: string, key: string): Promise<void> {
    const currentQueue = this.getQueueFromLocalStorage().filter(q => q.id !== id && q.key !== key);
    this.saveQueueToLocalStorage(currentQueue);

    try {
      const db = await this.dbPromise;
      if (db) {
        const tx = db.transaction(STORE_QUEUE, 'readwrite');
        const store = tx.objectStore(STORE_QUEUE);
        store.delete(id);
      }
    } catch (e) {
      // Ignored
    }
  }

  // Clear entire sync queue
  async clearQueue(): Promise<void> {
    this.saveQueueToLocalStorage([]);
    try {
      const db = await this.dbPromise;
      if (db) {
        const tx = db.transaction(STORE_QUEUE, 'readwrite');
        const store = tx.objectStore(STORE_QUEUE);
        store.clear();
      }
    } catch (e) {
      // Ignored
    }
  }

  // Pending items count
  async getPendingCount(): Promise<number> {
    const queue = await this.getPendingQueue();
    return queue.length;
  }

  // LocalStorage Helpers
  private getFromLocalStorage<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(`agrovet_local_${key}`);
      if (raw) return JSON.parse(raw) as T;
    } catch (e) {
      // Ignored
    }
    return null;
  }

  private saveToLocalStorage(key: string, data: any): void {
    try {
      localStorage.setItem(`agrovet_local_${key}`, JSON.stringify(data));
      localStorage.setItem(`agrovet_local_${key}_updatedAt`, String(Date.now()));
    } catch (e) {
      console.warn('[LocalDB] LocalStorage quota exceeded or error:', e);
    }
  }

  private getQueueFromLocalStorage(): SyncQueueItem[] {
    try {
      const raw = localStorage.getItem('agrovet_offline_sync_queue');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // Ignored
    }
    return [];
  }

  private saveQueueToLocalStorage(queue: SyncQueueItem[]): void {
    try {
      localStorage.setItem('agrovet_offline_sync_queue', JSON.stringify(queue));
    } catch (e) {
      // Ignored
    }
  }
}

export const localDb = new LocalDatabase();
