import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { subscribeSyncStatus, syncPendingChanges, SyncStatusInfo } from '../services/storage';

interface SyncStatusBadgeProps {
  compact?: boolean;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ compact = false }) => {
  const [status, setStatus] = useState<SyncStatusInfo>({
    state: typeof navigator !== 'undefined' && navigator.onLine ? 'synced' : 'offline',
    pendingCount: 0,
    lastSyncedAt: new Date(),
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    try {
      await syncPendingChanges();
    } finally {
      setIsManualSyncing(false);
    }
  };

  const isSyncing = status.state === 'syncing' || isManualSyncing;
  const isOffline = !status.isOnline || status.state === 'offline';
  const hasPending = status.pendingCount > 0;

  if (compact) {
    return (
      <button
        onClick={handleManualSync}
        disabled={isOffline || isSyncing}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider transition-all ${
          isOffline
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : hasPending
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
        }`}
        title={
          isOffline
            ? `Offline - ${hasPending ? `${status.pendingCount} local changes queued` : 'Local Storage Active'}`
            : hasPending
            ? `${status.pendingCount} pending cloud updates. Click to sync.`
            : 'Cloud Synced'
        }
      >
        {isOffline ? (
          <CloudOff className="w-3 h-3 text-amber-600 flex-shrink-0" />
        ) : isSyncing ? (
          <RefreshCw className="w-3 h-3 text-blue-600 animate-spin flex-shrink-0" />
        ) : hasPending ? (
          <RefreshCw className="w-3 h-3 text-blue-600 flex-shrink-0" />
        ) : (
          <Cloud className="w-3 h-3 text-emerald-600 flex-shrink-0" />
        )}
        <span>
          {isOffline
            ? (hasPending ? `${status.pendingCount} Offline` : 'Offline')
            : isSyncing
            ? 'Syncing...'
            : hasPending
            ? `${status.pendingCount} Pending`
            : 'Synced'}
        </span>
      </button>
    );
  }

  return (
    <div
      onClick={status.isOnline && hasPending ? handleManualSync : undefined}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all shadow-sm ${
        isOffline
          ? 'bg-amber-50/90 text-amber-800 border-amber-200 cursor-default'
          : isSyncing
          ? 'bg-blue-50/90 text-blue-800 border-blue-200 cursor-wait'
          : hasPending
          ? 'bg-blue-50/90 text-blue-800 border-blue-200 cursor-pointer hover:bg-blue-100'
          : 'bg-emerald-50/90 text-emerald-800 border-emerald-200 cursor-default'
      }`}
      title="Local & Cloud Persistence Status"
    >
      {isOffline ? (
        <>
          <CloudOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Offline Mode</span>
            <span className="text-[9px] text-amber-600 font-semibold leading-none">
              {hasPending ? `${status.pendingCount} changes saved locally` : 'Local Storage Active'}
            </span>
          </div>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">Syncing...</span>
            <span className="text-[9px] text-blue-500 font-semibold leading-none">Updating cloud records</span>
          </div>
        </>
      ) : hasPending ? (
        <>
          <RefreshCw className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
              {status.pendingCount} Pending Sync
            </span>
            <span className="text-[9px] text-blue-500 font-semibold leading-none">Click to push changes</span>
          </div>
        </>
      ) : (
        <>
          <Cloud className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Cloud Synced</span>
            <span className="text-[9px] text-emerald-600 font-semibold leading-none">Local & Cloud in sync</span>
          </div>
        </>
      )}
    </div>
  );
};
