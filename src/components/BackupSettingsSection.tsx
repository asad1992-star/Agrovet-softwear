import React, { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  HardDrive,
  Cloud,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Database,
  Clock,
  Zap,
  Layers
} from 'lucide-react';
import {
  Animal,
  ReproductionEvent,
  HealthEvent,
  ProtocolEnrollment,
  ProtocolTemplate,
  Medicine,
  MedicinePurchase,
  FarmSettings
} from '../types';
import {
  performAutomaticBackup,
  getLatestBackupMetadata,
  getLatestBackupData,
  restoreFarmDataFromBackup,
  triggerDownloadBackupFile,
  BackupMetadata,
  FarmBackupData
} from '../services/backupService';

interface BackupSettingsSectionProps {
  settings: FarmSettings;
  updateSettings: (newSettings: FarmSettings) => void;
  animals: Animal[];
  reproEvents: ReproductionEvent[];
  healthEvents: HealthEvent[];
  enrollments: ProtocolEnrollment[];
  customProtocols: ProtocolTemplate[];
  medicines: Medicine[];
  purchases: MedicinePurchase[];
  onShowToast: (msg: string) => void;
  setConfirmDialog: (dialog: {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  }) => void;
}

export const BackupSettingsSection: React.FC<BackupSettingsSectionProps> = ({
  settings,
  updateSettings,
  animals,
  reproEvents,
  healthEvents,
  enrollments,
  customProtocols,
  medicines,
  purchases,
  onShowToast,
  setConfirmDialog
}) => {
  const [backupMeta, setBackupMeta] = useState<BackupMetadata | null>(() => getLatestBackupMetadata());
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const isAutoBackupEnabled = settings.autoBackupEnabled !== false;

  useEffect(() => {
    setBackupMeta(getLatestBackupMetadata());
  }, [animals, reproEvents, healthEvents, enrollments, medicines, purchases, settings]);

  const handleToggleAutoBackup = () => {
    const nextState = !isAutoBackupEnabled;
    updateSettings({
      ...settings,
      autoBackupEnabled: nextState
    });

    if (nextState) {
      // If user enables it, perform an instant initial snapshot
      const meta = performAutomaticBackup({
        animals,
        reproEvents,
        healthEvents,
        enrollments,
        customProtocols,
        medicines,
        purchases,
        settings: { ...settings, autoBackupEnabled: true }
      }, 'daily_automatic');
      setBackupMeta(meta);
      onShowToast('Daily automatic local backup enabled. Farm snapshot saved.');
    } else {
      onShowToast('Daily automatic local backup paused.');
    }
  };

  const handleManualBackupNow = () => {
    setIsBackingUp(true);
    try {
      const meta = performAutomaticBackup({
        animals,
        reproEvents,
        healthEvents,
        enrollments,
        customProtocols,
        medicines,
        purchases,
        settings
      }, 'manual_snapshot');
      setBackupMeta(meta);
      onShowToast(`Manual backup saved to local storage (${meta.sizeFormatted}, ${meta.totalRecords} records).`);
    } catch (err) {
      console.error(err);
      onShowToast('Failed to save local backup.');
    } finally {
      setTimeout(() => setIsBackingUp(false), 400);
    }
  };

  const handleRestoreLatestAutoBackup = () => {
    const backupData = getLatestBackupData();
    if (!backupData) {
      onShowToast('No automatic backup found in local storage.');
      return;
    }

    const animalCount = backupData.animals?.length || 0;
    const reproCount = backupData.reproEvents?.length || 0;
    const healthCount = backupData.healthEvents?.length || 0;
    const medCount = backupData.medicines?.length || 0;
    const dateStr = backupMeta?.dateStr || new Date(backupData.exportDate).toLocaleString();

    setConfirmDialog({
      isOpen: true,
      title: 'Restore Automatic Local Backup',
      message: `Restore farm snapshot from ${dateStr}?\n\nThis will restore ${animalCount} animals, ${reproCount} repro events, ${healthCount} health logs, and ${medCount} medicines. Current data will be replaced.`,
      confirmLabel: 'Restore & Reload',
      onConfirm: async () => {
        setIsRestoring(true);
        try {
          await restoreFarmDataFromBackup(backupData);
          onShowToast('Auto-backup restored successfully! Refreshing...');
          setTimeout(() => {
            window.location.reload();
          }, 600);
        } catch (e) {
          console.error(e);
          onShowToast('Error restoring backup.');
          setIsRestoring(false);
        }
      }
    });
  };

  const handleExportJSON = () => {
    const backupData: FarmBackupData = {
      exportDate: new Date().toISOString(),
      backupType: 'manual_export',
      version: '2.0.0',
      farmName: settings.farmName || "Asad's Farm",
      animals,
      reproEvents,
      healthEvents,
      enrollments,
      customProtocols,
      medicines,
      purchases,
      settings
    };
    triggerDownloadBackupFile(backupData);
    onShowToast('Exported full JSON farm backup file.');
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as FarmBackupData;

      if (!data || (!data.animals && !data.reproEvents && !data.healthEvents && !data.medicines)) {
        throw new Error('Invalid schema');
      }

      setConfirmDialog({
        isOpen: true,
        title: 'Restore from Backup File',
        message: `Restore data from "${file.name}"? This will overwrite your current farm database with the uploaded backup.`,
        confirmLabel: 'Overwrite & Restore',
        onConfirm: async () => {
          setIsRestoring(true);
          try {
            await restoreFarmDataFromBackup(data);
            onShowToast('Backup file restored! Reloading application...');
            setTimeout(() => {
              window.location.reload();
            }, 600);
          } catch (err) {
            console.error(err);
            onShowToast('Failed to apply backup data.');
            setIsRestoring(false);
          }
        }
      });
    } catch (err) {
      alert('Invalid backup file. Please select a valid JSON export generated by this application.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50 rounded-3xl border border-emerald-100/90 shadow-sm mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-emerald-100/80">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200/50">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-black text-slate-800 tracking-tight">
                Farm Data Protection & Backups
              </h4>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  isAutoBackupEnabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {isAutoBackupEnabled ? '● Daily Auto-Backup Active' : '○ Auto-Backup Paused'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Automated daily snapshots stored in local storage with multi-cloud synchronization.
            </p>
          </div>
        </div>

        {/* The UI Toggle */}
        <div className="flex items-center gap-3 bg-white/90 px-4 py-2.5 rounded-2xl border border-emerald-200/70 shadow-xs self-start sm:self-auto">
          <span className="text-xs font-black text-slate-700 select-none">
            {isAutoBackupEnabled ? 'Daily Auto-Backup' : 'Auto-Backup Off'}
          </span>
          <button
            id="toggle-daily-backup"
            type="button"
            role="switch"
            aria-checked={isAutoBackupEnabled}
            onClick={handleToggleAutoBackup}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              isAutoBackupEnabled ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span className="sr-only">Toggle Daily Auto Backup to Local Storage</span>
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isAutoBackupEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Backup Status & Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Card 1: Last Snapshot Time */}
        <div className="bg-white/80 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Last Local Snapshot
            </span>
            <p className="text-sm font-black text-slate-800 mt-0.5">
              {backupMeta ? backupMeta.dateStr : 'Pending first backup'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {isAutoBackupEnabled ? 'Scheduled once every 24 hours' : 'Auto-scheduling disabled'}
            </p>
          </div>
        </div>

        {/* Card 2: Storage Size & Target */}
        <div className="bg-white/80 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Storage Footprint
            </span>
            <p className="text-sm font-black text-slate-800 mt-0.5">
              {backupMeta ? `${backupMeta.sizeFormatted} (${backupMeta.totalRecords} records)` : '0 Bytes'}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              Browser Local Storage & Cloud
            </div>
          </div>
        </div>

        {/* Card 3: Integrity & Coverage */}
        <div className="bg-white/80 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <Database className="w-5 h-5" />
          </div>
          <div className="w-full">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Included Datasets
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {animals.length} Animals
              </span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {reproEvents.length} Repro
              </span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {healthEvents.length} Health
              </span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {medicines.length} Meds
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleManualBackupNow}
            disabled={isBackingUp}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-emerald-700 active:scale-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Zap className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
            {isBackingUp ? 'Saving Snapshot...' : 'Backup Now'}
          </button>

          {backupMeta && (
            <button
              type="button"
              onClick={handleRestoreLatestAutoBackup}
              disabled={isRestoring}
              className="flex items-center gap-2 bg-white border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-emerald-50 active:scale-95 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className={`w-4 h-4 text-emerald-600 ${isRestoring ? 'animate-spin' : ''}`} />
              Restore Latest Snapshot
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-black active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export JSON
          </button>

          <label className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-50 active:scale-95 transition-all shadow-xs cursor-pointer">
            <Upload className="w-4 h-4 text-slate-500" /> Restore from File
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileRestore}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
