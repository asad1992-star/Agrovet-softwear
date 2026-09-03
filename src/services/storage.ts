import { Animal, ReproductionEvent, HealthEvent, FarmSettings, ProtocolEnrollment, ProtocolTemplate, Medicine, MedicinePurchase, PenMovement, PenMapping } from '../types';
import { MOCK_ANIMALS, MOCK_REPRO_EVENTS, MOCK_HEALTH_EVENTS, PREDEFINED_PROTOCOLS, MOCK_MEDICINES, MOCK_MEDICINE_PURCHASES } from '../data';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { localDb } from './localDatabase';
import { authService, AuthUser } from './authService';

export const DEFAULT_PEN_MAPPING: PenMapping = {
  fresh: 'Fresh',
  highLactating: 'High Lactating',
  mediumLactating: 'Medium Lactating',
  lowLactating: 'Low Lactating',
  dryLactating: 'Dry Lactating',
  pregnantHeifers: 'Pregnant Heifers',
  breedableHeifers: 'Breedable Heifers',
  growingHeifers: 'Growing Heifers',
  postWeanedHeifers: 'Post Weaned Heifers',
  sucklingCalves: 'Suckling Calves'
};

export const DEFAULT_SETTINGS: FarmSettings = {
  gestationDays: 283,
  closeupDays: 21,
  dryPeriodDays: 60,
  pregnancyCheckDays: 30,
  estrusCycleDays: 21,
  pdfTemplate: 'Professional',
  farmName: "AgroVet Pro Farm",
  statusColors: {
    active: '#10B981',
    youngStock: '#F97316',
    pregnant: '#3B82F6',
    sick: '#EF4444',
    dry: '#64748B',
    closeup: '#8B5CF6',
    inProtocol: '#F59E0B',
    inseminated: '#06B6D4',
    observation: '#94A3B8'
  },
  customGroups: ['Main Herd', 'Growing Heifers', 'Post Weaning', 'Suckling', 'Elite', 'High Group', 'Medium Group', 'Breeding Heifers', 'Breeding Pen', 'Dry Cows', 'Fresh', 'Closeup', 'Pregnant'],
  technicians: ['Asad Mehmood', 'Faisal Sb'],
  semenCatalog: [],
  autoBackupEnabled: true,
  penMapping: DEFAULT_PEN_MAPPING,
  autoMoveHeiferOnPD: true
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

export const syncPendingChanges = async (): Promise<void> => {
  const user = authService.getCurrentUser();
  const userEmail = user?.email || 'default';
  notifySyncStatus({ state: 'syncing' });
  try {
    const keys = ['animals', 'repro', 'health', 'enrollments', 'protocols', 'medicines', 'purchases', 'settings'];
    const payload: Record<string, any> = {};
    for (const k of keys) {
      const scopedKey = getUserScopedKey(k, userEmail);
      const val = await localDb.get(scopedKey, null);
      if (val !== null) {
        payload[k] = val;
        try {
          const docRef = doc(db, 'userFarmData', scopedKey);
          await setDoc(docRef, { data: val, updatedAt: new Date().toISOString() });
        } catch (e) {}
      }
    }
    // Also push to Express API
    try {
      await fetch(`/api/farm-data/${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {}

    notifySyncStatus({ state: 'synced', pendingCount: 0, lastSyncedAt: new Date(), isOnline: true });
  } catch (error) {
    notifySyncStatus({ state: 'error' });
  }
};

// Get scoped key for the current active user email
export const getUserScopedKey = (baseKey: string, explicitEmail?: string): string => {
  const user = authService.getCurrentUser();
  const email = (explicitEmail || user?.email || 'default').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `agrovet_${email}_${baseKey}`;
};

// Check if current user is the master account (Asad Mehmood)
const isMasterAccount = (email?: string): boolean => {
  const target = (email || authService.getCurrentUser()?.email || '').toLowerCase();
  return target === 'chasad51992@gmail.com' || target === 'vetasad1992@gmail.com' || target === 'default';
};

// Cloud read with offline local fallback & user isolation
const getScopedData = async <T>(baseKey: string, defaultData: T, explicitEmail?: string): Promise<T> => {
  const key = getUserScopedKey(baseKey, explicitEmail);
  const userEmail = explicitEmail || authService.getCurrentUser()?.email || 'default';
  const isMaster = isMasterAccount(userEmail);

  // 1. Check local IndexedDB / LocalStorage first
  const localData = await localDb.get<T | null>(key, null);
  if (localData !== null) {
    return localData;
  }

  // 2. Try fetching from Server API /api/farm-data/:email
  try {
    const res = await fetch(`/api/farm-data/${encodeURIComponent(userEmail)}`);
    if (res.ok) {
      const json = await res.json();
      if (json?.data && json.data[baseKey] !== undefined) {
        const serverData = json.data[baseKey] as T;
        await localDb.set(key, serverData);
        return serverData;
      }
    }
  } catch (e) {
    // Server route offline or pending
  }

  // 3. Try Firebase Firestore
  try {
    const docRef = doc(db, 'userFarmData', key);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const cloudData = docSnap.data().data as T;
      await localDb.set(key, cloudData);
      return cloudData;
    }
  } catch (error) {
    // Firestore error
  }

  // 4. Default fallback:
  // For master account: provide default initial herd (212 animals / sample data)
  // For new users: return clean empty array/object (Option A: clean slate zero-cow database)
  const initialValue = isMaster ? defaultData : (Array.isArray(defaultData) ? ([] as unknown as T) : defaultData);
  await localDb.set(key, initialValue);
  return initialValue;
};

// Save scoped data locally & sync to server + Firestore
const saveScopedData = async (baseKey: string, data: any, explicitEmail?: string) => {
  const key = getUserScopedKey(baseKey, explicitEmail);
  const userEmail = explicitEmail || authService.getCurrentUser()?.email || 'default';

  // 1. Always immediately persist to IndexedDB & LocalStorage
  await localDb.set(key, data);

  // 2. Sync to Express Server /api/farm-data/:email
  try {
    fetch(`/api/farm-data/${encodeURIComponent(userEmail)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [baseKey]: data })
    }).catch(() => {});
  } catch (e) {}

  // 3. Sync to Firebase Firestore if online
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline) {
    try {
      const docRef = doc(db, 'userFarmData', key);
      await setDoc(docRef, { data, updatedAt: new Date().toISOString() });
      notifySyncStatus({ isOnline: true, state: 'synced', lastSyncedAt: new Date() });
    } catch (e) {
      notifySyncStatus({ state: 'pending' });
    }
  }
};

export const storageService = {
  getAnimals: (email?: string) => getScopedData<Animal[]>('animals', MOCK_ANIMALS, email),
  saveAnimals: (data: Animal[], email?: string) => saveScopedData('animals', data, email),

  getReproEvents: (email?: string) => getScopedData<ReproductionEvent[]>('repro', MOCK_REPRO_EVENTS, email),
  saveReproEvents: (data: ReproductionEvent[], email?: string) => saveScopedData('repro', data, email),

  getHealthEvents: (email?: string) => getScopedData<HealthEvent[]>('health', MOCK_HEALTH_EVENTS, email),
  saveHealthEvents: (data: HealthEvent[], email?: string) => saveScopedData('health', data, email),

  getEnrollments: (email?: string) => getScopedData<ProtocolEnrollment[]>('enrollments', [], email),
  saveEnrollments: (data: ProtocolEnrollment[], email?: string) => saveScopedData('enrollments', data, email),

  getProtocols: (email?: string) => getScopedData<ProtocolTemplate[]>('protocols', PREDEFINED_PROTOCOLS, email),
  saveProtocols: (data: ProtocolTemplate[], email?: string) => saveScopedData('protocols', data, email),

  getCustomProtocols: (email?: string) => getScopedData<ProtocolTemplate[]>('protocols', PREDEFINED_PROTOCOLS, email),
  saveCustomProtocols: (data: ProtocolTemplate[], email?: string) => saveScopedData('protocols', data, email),

  getMedicines: (email?: string) => getScopedData<Medicine[]>('medicines', MOCK_MEDICINES, email),
  saveMedicines: (data: Medicine[], email?: string) => saveScopedData('medicines', data, email),

  getPurchases: (email?: string) => getScopedData<MedicinePurchase[]>('purchases', MOCK_MEDICINE_PURCHASES, email),
  savePurchases: (data: MedicinePurchase[], email?: string) => saveScopedData('purchases', data, email),

  getDismissedAlertIds: (email?: string) => getScopedData<string[]>('dismissed_alerts', [], email),
  saveDismissedAlertIds: (data: string[], email?: string) => saveScopedData('dismissed_alerts', data, email),

  getPenMovements: (email?: string) => getScopedData<PenMovement[]>('pen_movements', [], email),
  savePenMovements: (data: PenMovement[], email?: string) => saveScopedData('pen_movements', data, email),

  getSettings: async (email?: string): Promise<FarmSettings> => {
    const raw = await getScopedData<FarmSettings>('settings', DEFAULT_SETTINGS, email);
    return {
      ...DEFAULT_SETTINGS,
      ...raw,
      statusColors: { ...DEFAULT_SETTINGS.statusColors, ...(raw?.statusColors || {}) }
    };
  },
  saveSettings: (data: FarmSettings, email?: string) => saveScopedData('settings', data, email),

  // Clear or load fresh workspace for switched account
  loadUserWorkspace: async (userEmail: string) => {
    const [animals, reproEvents, healthEvents, medicines, purchases, enrollments, protocols, settings, dismissedAlertIds, penMovements] = await Promise.all([
      storageService.getAnimals(userEmail),
      storageService.getReproEvents(userEmail),
      storageService.getHealthEvents(userEmail),
      storageService.getMedicines(userEmail),
      storageService.getPurchases(userEmail),
      storageService.getEnrollments(userEmail),
      storageService.getProtocols(userEmail),
      storageService.getSettings(userEmail),
      storageService.getDismissedAlertIds(userEmail),
      storageService.getPenMovements(userEmail)
    ]);

    return {
      animals,
      reproEvents,
      healthEvents,
      medicines,
      purchases,
      enrollments,
      protocols: protocols && protocols.length > 0 ? protocols : PREDEFINED_PROTOCOLS,
      customProtocols: protocols && protocols.length > 0 ? protocols : PREDEFINED_PROTOCOLS,
      settings,
      dismissedAlertIds: dismissedAlertIds || [],
      penMovements: penMovements || []
    };
  }
};
