import { Animal, ReproductionEvent, HealthEvent, FarmSettings, ProtocolEnrollment, ProtocolTemplate, Medicine, MedicinePurchase } from '../types';
import { storageService } from './storage';

export interface FarmBackupData {
  exportDate: string;
  backupType?: 'daily_automatic' | 'manual_export' | 'manual_snapshot';
  version: string;
  farmName?: string;
  animals: Animal[];
  reproEvents: ReproductionEvent[];
  healthEvents: HealthEvent[];
  enrollments: ProtocolEnrollment[];
  customProtocols?: ProtocolTemplate[];
  medicines?: Medicine[];
  purchases?: MedicinePurchase[];
  settings?: FarmSettings;
}

export interface BackupMetadata {
  timestamp: number;
  dateStr: string;
  sizeBytes: number;
  sizeFormatted: string;
  totalRecords: number;
  breakdown: {
    animals: number;
    reproEvents: number;
    healthEvents: number;
    medicines: number;
    purchases: number;
    enrollments: number;
  };
}

const BACKUP_STORAGE_KEY = 'agrovet_auto_backup';
const BACKUP_TIME_KEY = 'agrovet_backup_time';
const BACKUP_META_KEY = 'agrovet_backup_meta';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function calculateBackupMetadata(data: FarmBackupData, timestamp: number = Date.now()): BackupMetadata {
  const jsonStr = JSON.stringify(data);
  const sizeBytes = new Blob([jsonStr]).size;
  
  const animalsCount = data.animals?.length || 0;
  const reproCount = data.reproEvents?.length || 0;
  const healthCount = data.healthEvents?.length || 0;
  const medsCount = data.medicines?.length || 0;
  const purchasesCount = data.purchases?.length || 0;
  const enrollCount = data.enrollments?.length || 0;
  const totalRecords = animalsCount + reproCount + healthCount + medsCount + purchasesCount + enrollCount;

  return {
    timestamp,
    dateStr: new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    sizeBytes,
    sizeFormatted: formatBytes(sizeBytes),
    totalRecords,
    breakdown: {
      animals: animalsCount,
      reproEvents: reproCount,
      healthEvents: healthCount,
      medicines: medsCount,
      purchases: purchasesCount,
      enrollments: enrollCount
    }
  };
}

export function performAutomaticBackup(
  dataset: {
    animals: Animal[];
    reproEvents: ReproductionEvent[];
    healthEvents: HealthEvent[];
    enrollments: ProtocolEnrollment[];
    customProtocols?: ProtocolTemplate[];
    medicines?: Medicine[];
    purchases?: MedicinePurchase[];
    settings?: FarmSettings;
  },
  backupType: 'daily_automatic' | 'manual_snapshot' = 'daily_automatic'
): BackupMetadata {
  const timestamp = Date.now();
  const backupData: FarmBackupData = {
    exportDate: new Date(timestamp).toISOString(),
    backupType,
    version: '2.0.0',
    farmName: dataset.settings?.farmName || "Asad's Farm",
    animals: dataset.animals || [],
    reproEvents: dataset.reproEvents || [],
    healthEvents: dataset.healthEvents || [],
    enrollments: dataset.enrollments || [],
    customProtocols: dataset.customProtocols || [],
    medicines: dataset.medicines || [],
    purchases: dataset.purchases || [],
    settings: dataset.settings
  };

  const meta = calculateBackupMetadata(backupData, timestamp);

  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backupData));
    localStorage.setItem(BACKUP_TIME_KEY, timestamp.toString());
    localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
  } catch (err) {
    console.warn('[BackupService] Could not save to localStorage:', err);
  }

  return meta;
}

export function getLatestBackupMetadata(): BackupMetadata | null {
  try {
    const rawMeta = localStorage.getItem(BACKUP_META_KEY);
    if (rawMeta) {
      return JSON.parse(rawMeta) as BackupMetadata;
    }
    const rawBackup = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (rawBackup) {
      const data = JSON.parse(rawBackup) as FarmBackupData;
      const timestamp = parseInt(localStorage.getItem(BACKUP_TIME_KEY) || Date.now().toString());
      return calculateBackupMetadata(data, timestamp);
    }
  } catch (e) {
    console.warn('[BackupService] Failed reading backup metadata:', e);
  }
  return null;
}

export function getLatestBackupData(): FarmBackupData | null {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FarmBackupData;
  } catch (e) {
    console.warn('[BackupService] Failed reading backup data:', e);
    return null;
  }
}

export function isDailyBackupDue(autoBackupEnabled = true): boolean {
  if (!autoBackupEnabled) return false;
  const lastTimeStr = localStorage.getItem(BACKUP_TIME_KEY);
  if (!lastTimeStr) return true;
  const lastTime = parseInt(lastTimeStr);
  if (isNaN(lastTime)) return true;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  return (Date.now() - lastTime) >= ONE_DAY_MS;
}

export async function restoreFarmDataFromBackup(data: FarmBackupData): Promise<void> {
  if (data.animals && Array.isArray(data.animals)) {
    await storageService.saveAnimals(data.animals);
  }
  if (data.reproEvents && Array.isArray(data.reproEvents)) {
    await storageService.saveReproEvents(data.reproEvents);
  }
  if (data.healthEvents && Array.isArray(data.healthEvents)) {
    await storageService.saveHealthEvents(data.healthEvents);
  }
  if (data.enrollments && Array.isArray(data.enrollments)) {
    await storageService.saveEnrollments(data.enrollments);
  }
  if (data.customProtocols && Array.isArray(data.customProtocols)) {
    await storageService.saveCustomProtocols(data.customProtocols);
  }
  if (data.medicines && Array.isArray(data.medicines)) {
    await storageService.saveMedicines(data.medicines);
  }
  if (data.purchases && Array.isArray(data.purchases)) {
    await storageService.savePurchases(data.purchases);
  }
  if (data.settings) {
    await storageService.saveSettings(data.settings);
  }
}

export function triggerDownloadBackupFile(data: FarmBackupData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = (data.farmName || 'agrovet').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.download = `${safeName}_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
