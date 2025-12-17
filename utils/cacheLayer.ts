// Section 7.1: Multi-tier Caching & Performance Optimization
// Level 1: LocalStorage (7 days)
// Level 2: IndexedDB (Indices for optimized querying)

const DB_NAME = 'MutationMechanicDB';
const STORE_NAME = 'genomic_annotations';
const HISTORY_STORE = 'history';
const DB_VERSION = 4; // Section 7.3: Incremented for optimized indices

// TTL Constants
const TTL_LOCALSTORAGE = 7 * 24 * 60 * 60 * 1000; // 7 Days
const TTL_INDEXEDDB = 30 * 24 * 60 * 60 * 1000;   // 30 Days
const ARCHIVE_THRESHOLD = 365 * 24 * 60 * 60 * 1000; // 1 Year (Section 7.1)

class TieredCache {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.dbPromise = this.openDB();
      this.performMaintenance();
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }

        // Section 7.3 Query Optimization: Add Indices
        let historyStore: IDBObjectStore;
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          historyStore = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        } else {
          historyStore = (event.target as IDBOpenDBRequest).transaction!.objectStore(HISTORY_STORE);
        }

        if (!historyStore.indexNames.contains('gene')) {
          historyStore.createIndex('gene', 'gene', { unique: false });
        }
        if (!historyStore.indexNames.contains('timestamp')) {
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!historyStore.indexNames.contains('riskLevel')) {
          historyStore.createIndex('riskLevel', 'riskLevel', { unique: false });
        }
        if (!historyStore.indexNames.contains('pathogenicityLabel')) {
          historyStore.createIndex('pathogenicityLabel', 'pathogenicityLabel', { unique: false });
        }
      };
    });
  }

  // Section 7.1 maintenance: Cleanup data older than 1 year
  private async performMaintenance() {
    if (!this.dbPromise) return;
    try {
      const db = await this.dbPromise;
      const cutoff = Date.now() - ARCHIVE_THRESHOLD;

      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      
      const request = index.openCursor(range);
      request.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (e) {
      console.warn('Maintenance failed', e);
    }
  }

  async getDB(): Promise<IDBDatabase | null> {
    return this.dbPromise;
  }

  async set(key: string, data: any): Promise<void> {
    const timestamp = Date.now();
    const payload = { key, data, timestamp };

    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.warn('LocalStorage full or unavailable', e);
    }

    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(payload);
      } catch (e) {
        console.warn('IndexedDB write failed', e);
      }
    }
  }

  async get(key: string): Promise<any | null> {
    const now = Date.now();

    try {
      const lsItem = localStorage.getItem(key);
      if (lsItem) {
        const parsed = JSON.parse(lsItem);
        if (now - parsed.timestamp < TTL_LOCALSTORAGE) {
          return parsed.data;
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch (e) { /* Ignore */ }

    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        
        const item: any = await new Promise((resolve, reject) => {
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        if (item) {
          if (now - item.timestamp < TTL_INDEXEDDB) {
            this.set(key, item.data); 
            return item.data;
          } else {
            const delTx = db.transaction(STORE_NAME, 'readwrite');
            delTx.objectStore(STORE_NAME).delete(key);
          }
        }
      } catch (e) {
        console.warn('IndexedDB read failed', e);
      }
    }
    return null;
  }
}

export const tieredCache = new TieredCache();