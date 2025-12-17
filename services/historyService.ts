import { tieredCache } from '../utils/cacheLayer';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type MutationType = 'MISSENSE' | 'FRAMESHIFT' | 'NONSENSE' | 'SPLICE_SITE' | 'INDEL' | 'UNKNOWN';
export type PathogenicityType = 'ALL' | 'BENIGN' | 'VUS' | 'PATHOGENIC';

export interface HistoryRecord {
  id: string;
  gene: string;
  variant: string;
  timestamp: number;
  riskLevel: RiskLevel;
  pathogenicityScore: number;
  pathogenicityLabel?: PathogenicityType; // Section 5.1
  confidence: number;
  diseaseAssociations: string[];
  therapies: string[];
  notes?: string;
  type: 'EXPLAINER' | 'DECODER';
  variantType: MutationType;
  position?: number;
  archived?: boolean; // Section 5.3
}

const HISTORY_STORE = 'history';

// Section 7.3: Cache for aggregated statistics
let cachedStats: any = null;

export const historyService = {
  async addRecord(record: Omit<HistoryRecord, 'id'>): Promise<string> {
    // Map score to label for filtering (Section 5.1)
    const pathogenicityLabel: PathogenicityType = 
      record.pathogenicityScore < 10 ? 'BENIGN' : 
      record.pathogenicityScore < 20 ? 'VUS' : 'PATHOGENIC';

    const id = `${record.gene}-${record.variant}-${Date.now()}`;
    const fullRecord = { ...record, id, archived: false, pathogenicityLabel };
    
    const db = await tieredCache.getDB();
    if (!db) return '';

    // Invalidate stats cache on write
    cachedStats = null;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const request = store.add(fullRecord);
      
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllRecords(): Promise<HistoryRecord[]> {
    const db = await tieredCache.getDB();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readonly');
      const store = tx.objectStore(HISTORY_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const records = request.result as HistoryRecord[];
        resolve(records.sort((a, b) => b.timestamp - a.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  },

  // Section 7.3: Optimized binary range query
  async getRecordsByDateRange(start: number, end: number): Promise<HistoryRecord[]> {
    const db = await tieredCache.getDB();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readonly');
      const store = tx.objectStore(HISTORY_STORE);
      const index = store.index('timestamp');
      const range = IDBKeyRange.bound(start, end);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async updateRecord(id: string, updates: Partial<HistoryRecord>): Promise<void> {
    const db = await tieredCache.getDB();
    if (!db) return;
    
    cachedStats = null; // Invalidate cache

    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          store.put({ ...record, ...updates });
          resolve();
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  async deleteRecord(id: string): Promise<void> {
    const db = await tieredCache.getDB();
    if (!db) return;

    cachedStats = null; // Invalidate cache

    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async clearHistory(): Promise<void> {
    const db = await tieredCache.getDB();
    if (!db) return;

    cachedStats = null; // Invalidate cache

    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};