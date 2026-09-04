import React from 'react';
import { Sparkles, Check, ChevronRight, X, History, ArrowLeft } from 'lucide-react';
import { APP_RELEASES, CURRENT_APP_VERSION, AppRelease, UpdateItem } from '../data/updatesData';

interface WhatsNewPopupProps {
  isOpen: boolean;
  onGotIt: () => void;
  onViewAllUpdates: () => void;
}

export const WhatsNewPopup: React.FC<WhatsNewPopupProps> = ({
  isOpen,
  onGotIt,
  onViewAllUpdates,
}) => {
  if (!isOpen) return null;

  const latest = APP_RELEASES[0];

  const getBadge = (type: UpdateItem['type']) => {
    switch (type) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span>🆕</span> New
          </span>
        );
      case 'improved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
            <span>⚡</span> Improved
          </span>
        );
      case 'fixed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
            <span>🔧</span> Fixed
          </span>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onGotIt}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with clean gradient styling */}
        <div className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8">
          <button
            onClick={onGotIt}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">System Update</span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                🎉 What's New in Version {latest.version}
              </h2>
            </div>
          </div>
          <p className="text-xs text-blue-100/80 font-medium mt-2 leading-relaxed">
            {latest.tagline || 'You can now use these new features and improvements.'}
          </p>
        </div>

        {/* Highlights List */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-4 divide-y divide-slate-100 flex-1">
          {latest.notes.map((item, idx) => (
            <div key={idx} className={idx === 0 ? '' : 'pt-4'}>
              <div className="flex items-center gap-2 mb-1">
                {getBadge(item.type)}
                <h4 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">
                  {item.title}
                </h4>
              </div>
              {item.description && (
                <p className="text-xs text-slate-500 font-medium pl-1 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Action Footer */}
        <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onViewAllUpdates}
            className="w-full sm:w-auto px-4 py-3 text-slate-600 hover:text-blue-600 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span>View All Releases</span>
          </button>
          
          <button
            onClick={onGotIt}
            className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Got It</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface WhatsNewHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsNewHistoryModal: React.FC<WhatsNewHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-2xl rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 sm:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">App Release Notes & History</h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">Track latest features, enhancements, and fixes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Releases List */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 flex-1">
          {APP_RELEASES.map((release) => (
            <div key={release.version} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-600 text-white rounded-xl text-xs font-black tracking-wide">
                    v{release.version}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    Released on {release.releaseDate}
                  </span>
                </div>
                {release.version === CURRENT_APP_VERSION && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    Current Version
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                {release.tagline}
              </p>

              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                {release.notes.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                        item.type === 'new' ? 'bg-emerald-100 text-emerald-800' :
                        item.type === 'improved' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-900'
                      }`}>
                        {item.type}
                      </span>
                      <span className="text-xs font-black text-slate-800">{item.title}</span>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 font-medium pl-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
