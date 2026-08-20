import { Animal, ReproductionEvent, HealthEvent, FarmSettings, ProtocolEnrollment, ProtocolTemplate, Medicine, MedicinePurchase } from '../types';
import { MOCK_ANIMALS, MOCK_REPRO_EVENTS, MOCK_HEALTH_EVENTS, PREDEFINED_PROTOCOLS, MOCK_MEDICINES, MOCK_MEDICINE_PURCHASES } from '../data';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { localDb } from './localDatabase';

export const STORAGE_KEYS = {
  ANIMALS: 'agrovet_animals',
  REPRO: 'agrovet_repro',
  HEALTH: 'agrovet_health',
  SETTINGS: 'asad_settings',
  ENROLLMENTS: 'agrovet_enrollments',
  PROTOCOLS: 'agrovet_protocols',
  MEDICINES: 'agrovet_medicines',
  PURCHASES: 'agrovet_medicine_purchases'
};

export const DEFAULT_SETTINGS: FarmSettings = {
  gestationDays: 283,
  closeupDays: 21,
  dryPeriodDays: 60,
  pregnancyCheckDays: 30,
  estrusCycleDays: 21,
  pdfTemplate: 'Professional',
  farmName: "Asad's Farm",
  statusColors: {
    active: '#10B981',
    pregnant: '#3B82F6',
    sick: '#EF4444',
    dry: '#64748B',
    closeup: '#8B5CF6',
    inProtocol: '#F59E0B',
    inseminated: '#06B6D4',
    observation: '#94A3B8'
  },
  customGroups: ['Main Herd', 'Elite', 'High Group', 'Medium Group', 'Heifers', 'Breeding'],
  autoBackupEnabled: true
};

export type SyncState = 'synced' | 'pending' | 'syncing' | 'offline' | 'error';

export interface SyncStatusInfo {
  state: SyncState;
  pendingCount: number;
  lastSyncedAt: Date | null;
  isOnline: boolean;
  message?: string;
}

// Global Sync Status State & Listeners
let currentSyncStatus: SyncStatusInfo = {
  state: typeof navigator !== 'undefined' && navigator.onLine ? 'synced' : 'offline',
  pendingCount: 0,
  lastSyncedAt: new Date(),
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
};

const syncListeners = new Set<(status: SyncStatusInfo) => void>();

export const notifySyncStatus = (statusUpdate: Partial<SyncStatusInfo>) => {
  currentSyncStatus = { ...currentSyncStatus, ...statusUpdate };
  syncListeners.forEach(listener => {
    try {
      listener(currentSyncStatus);
    } catch (e) {
      console.warn('[SyncListener] Error notifying listener:', e);
    }
  });
};

export const subscribeSyncStatus = (listener: (status: SyncStatusInfo) => void) => {
  syncListeners.add(listener);
  listener(currentSyncStatus);
  return () => {
    syncListeners.delete(listener);
  };
};

export const getSyncStatus = (): SyncStatusInfo => currentSyncStatus;

// Timeout wrapper for network operations
const withTimeout = <T>(promise: Promise<T>, timeoutMs = 3500): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Network timeout')), timeoutMs)
    )
  ]);
};

// Cloud read with offline local fallback
const getWithOfflineFallback = async <T>(key: string, defaultData: T): Promise<T> => {
  // 1. Check local database first (IndexedDB / LocalStorage)
  const localData = await localDb.get<T | null>(key, null);

  // If we have local data and device is offline or in poor network, return local immediately
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline && localData !== null) {
    notifySyncStatus({ isOnline: false, state: 'offline' });
    return localData;
  }

  // If online, try fetching fresh from Firebase Firestore
  try {
    const docRef = doc(db, 'farmData', key);
    const docSnap = await withTimeout(getDoc(docRef), 3500);
    if (docSnap.exists()) {
      const cloudData = docSnap.data().data as T;
      // Update local storage in the background
      await localDb.set(key, cloudData);
      notifySyncStatus({ isOnline: true, state: 'synced', lastSyncedAt: new Date() });
      return cloudData;
    } else {
      // If cloud document does not exist yet, seed with local or default
      const finalData = localData !== null ? localData : defaultData;
      await localDb.set(key, finalData);
      return finalData;
    }
  } catch (error) {
    console.warn(`[Storage] Firebase fetch failed or timed out for ${key}, using local cache:`, error);
    // Fall back to local data if available, otherwise default
    const finalData = localData !== null ? localData : defaultData;
    if (localData === null) {
      await localDb.set(key, finalData);
    }
    notifySyncStatus({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
      state: !isOnline ? 'offline' : 'pending'
    });
    return finalData;
  }
};

// Cloud save with instant local save & offline sync queue
const saveWithOfflineSync = async (key: string, data: any) => {
  // 1. Immediately persist to Local-First IndexedDB & LocalStorage
  await localDb.set(key, data);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    const pendingCount = await localDb.enqueueSync(key, data);
    notifySyncStatus({
      isOnline: false,
      state: 'offline',
      pendingCount,
      message: `${pendingCount} change(s) saved locally for cloud sync`
    });
    return;
  }

  // 2. Try saving to Firebase Firestore if online
  try {
    const docRef = doc(db, 'farmData', key);
    await withTimeout(setDoc(docRef, { data, updatedAt: new Date().toISOString() }), 4000);
    const pending = await localDb.getPendingCount();
    notifySyncStatus({
      isOnline: true,
      state: pending > 0 ? 'pending' : 'synced',
      pendingCount: pending,
      lastSyncedAt: new Date()
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') return;
    console.warn(`[Storage] Cloud sync error for ${key}, queuing for later:`, error);
    const pendingCount = await localDb.enqueueSync(key, data);
    notifySyncStatus({
      state: 'pending',
      pendingCount,
      message: 'Network unstable - changes saved locally'
    });
  }
};

// Process offline sync queue when connection is restored
export const syncPendingChanges = async (): Promise<{ success: boolean; syncedCount: number }> => {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    return { success: false, syncedCount: 0 };
  }

  const queue = await localDb.getPendingQueue();
  if (queue.length === 0) {
    notifySyncStatus({ state: 'synced', pendingCount: 0, lastSyncedAt: new Date() });
    return { success: true, syncedCount: 0 };
  }

  notifySyncStatus({ state: 'syncing', message: `Syncing ${queue.length} pending record(s)...` });

  let syncedCount = 0;
  for (const item of queue) {
    try {
      const docRef = doc(db, 'farmData', item.key);
      await withTimeout(setDoc(docRef, { data: item.data, updatedAt: new Date().toISOString() }), 5000);
      await localDb.removeQueueItem(item.id, item.key);
      syncedCount++;
    } catch (e) {
      console.warn(`[Storage] Failed to sync pending item ${item.key}:`, e);
    }
  }

  const remaining = await localDb.getPendingCount();
  notifySyncStatus({
    state: remaining === 0 ? 'synced' : 'pending',
    pendingCount: remaining,
    lastSyncedAt: new Date(),
    message: remaining === 0 ? `All ${syncedCount} changes synced to cloud` : `${remaining} changes remaining`
  });

  return { success: remaining === 0, syncedCount };
};

// Attach window online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifySyncStatus({ isOnline: true, state: 'syncing' });
    syncPendingChanges();
  });

  window.addEventListener('offline', () => {
    localDb.getPendingCount().then(pendingCount => {
      notifySyncStatus({ isOnline: false, state: 'offline', pendingCount });
    });
  });
}

export const storageService = {
  getAnimals: () => getWithOfflineFallback<Animal[]>(STORAGE_KEYS.ANIMALS, MOCK_ANIMALS),
  saveAnimals: (data: Animal[]) => saveWithOfflineSync(STORAGE_KEYS.ANIMALS, data),

  getReproEvents: () => getWithOfflineFallback<ReproductionEvent[]>(STORAGE_KEYS.REPRO, MOCK_REPRO_EVENTS),
  saveReproEvents: (data: ReproductionEvent[]) => saveWithOfflineSync(STORAGE_KEYS.REPRO, data),

  getHealthEvents: () => getWithOfflineFallback<HealthEvent[]>(STORAGE_KEYS.HEALTH, MOCK_HEALTH_EVENTS),
  saveHealthEvents: (data: HealthEvent[]) => saveWithOfflineSync(STORAGE_KEYS.HEALTH, data),

  getEnrollments: () => getWithOfflineFallback<ProtocolEnrollment[]>(STORAGE_KEYS.ENROLLMENTS, []),
  saveEnrollments: (data: ProtocolEnrollment[]) => saveWithOfflineSync(STORAGE_KEYS.ENROLLMENTS, data),

  getCustomProtocols: () => getWithOfflineFallback<ProtocolTemplate[]>(STORAGE_KEYS.PROTOCOLS, []),
  saveCustomProtocols: (data: ProtocolTemplate[]) => saveWithOfflineSync(STORAGE_KEYS.PROTOCOLS, data),

  getMedicines: () => getWithOfflineFallback<Medicine[]>(STORAGE_KEYS.MEDICINES, MOCK_MEDICINES),
  saveMedicines: (data: Medicine[]) => saveWithOfflineSync(STORAGE_KEYS.MEDICINES, data),

  getPurchases: () => getWithOfflineFallback<MedicinePurchase[]>(STORAGE_KEYS.PURCHASES, MOCK_MEDICINE_PURCHASES),
  savePurchases: (data: MedicinePurchase[]) => saveWithOfflineSync(STORAGE_KEYS.PURCHASES, data),

  getSettings: async (): Promise<FarmSettings> => {
    const raw = await getWithOfflineFallback<FarmSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return {
      ...DEFAULT_SETTINGS,
      ...raw,
      statusColors: { ...DEFAULT_SETTINGS.statusColors, ...(raw.statusColors || {}) }
    };
  },
  saveSettings: (data: FarmSettings) => saveWithOfflineSync(STORAGE_KEYS.SETTINGS, data),

  syncPendingChanges
};

