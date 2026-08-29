import React, { useState } from 'react';
import {
  Calendar,
  ClipboardList,
  CheckCircle2,
  Share2,
  Printer,
  Copy,
  Check,
  Syringe,
  Stethoscope,
  Baby,
  Eye,
  FlaskConical,
  X,
  ChevronRight,
  AlertTriangle,
  Send,
  Building,
  Clock
} from 'lucide-react';
import {
  DailyActionSheet,
  DailyTreatmentTask,
  DailyPdTask,
  DailyCalvingDryOffTask,
  DailyHeatWatchTask,
  DailyProtocolTask,
  formatActionSheetForWhatsApp
} from '../services/dailyActionSheetService';

interface DailyActionSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionSheet: DailyActionSheet;
  currentDate: string;
  onDateChange: (date: string) => void;
  onAdministerDose: (task: DailyTreatmentTask) => void;
  onOpenPdCheck: (animalId: string) => void;
  onOpenAnimalProfile: (animalId: string) => void;
  onOpenMovePen?: (animalId: string) => void;
}

export const DailyActionSheetModal: React.FC<DailyActionSheetModalProps> = ({
  isOpen,
  onClose,
  actionSheet,
  currentDate,
  onDateChange,
  onAdministerDose,
  onOpenPdCheck,
  onOpenAnimalProfile,
  onOpenMovePen
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'treatments' | 'pd' | 'calving' | 'heat' | 'protocols'>('all');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyWhatsApp = () => {
    const text = formatActionSheetForWhatsApp(actionSheet);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsAppDirect = () => {
    const text = formatActionSheetForWhatsApp(actionSheet);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const isToday = currentDate === new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Daily Farm Action Sheet</h2>
                <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  {actionSheet.totalTasksCount} Tasks
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-bold flex items-center gap-1.5 mt-0.5">
                <span>{actionSheet.farmName}</span>
                <span>•</span>
                <span>Morning Farm Task List</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Date Filter */}
        <div className="px-6 sm:px-8 py-3.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={currentDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 shadow-xs focus:ring-2 focus:ring-emerald-500/20"
            />
            {isToday ? (
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg">
                Today
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onDateChange(new Date().toISOString().split('T')[0])}
                className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-800 underline"
              >
                Jump to Today
              </button>
            )}
          </div>

          {/* Quick Share / Export Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleShareWhatsAppDirect}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black rounded-xl shadow-xs transition-all active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="px-6 sm:px-8 pt-3 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Tasks', count: actionSheet.totalTasksCount, color: 'text-slate-800' },
            { id: 'treatments', label: '💉 Injections', count: actionSheet.treatments.length, color: 'text-rose-600' },
            { id: 'pd', label: '🔍 PD Checks', count: actionSheet.pdChecks.length, color: 'text-blue-600' },
            { id: 'calving', label: '🐄 Calving & Dry', count: actionSheet.calvingAndDryOff.length, color: 'text-amber-600' },
            { id: 'heat', label: '👁️ Heat Watch', count: actionSheet.heatWatch.length, color: 'text-purple-600' },
            { id: 'protocols', label: '🧪 Protocols', count: actionSheet.protocols.length, color: 'text-teal-600' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-3 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? `border-emerald-600 ${tab.color}`
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-slate-100 text-slate-800 font-bold' : 'bg-slate-100 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-rose-50/80 border border-rose-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Injections</p>
                <p className="text-xl font-black text-rose-800">{actionSheet.treatments.length}</p>
              </div>
              <Syringe className="w-6 h-6 text-rose-400" />
            </div>

            <div className="p-4 bg-blue-50/80 border border-blue-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">PD Checks Due</p>
                <p className="text-xl font-black text-blue-800">{actionSheet.pdChecks.length}</p>
              </div>
              <Stethoscope className="w-6 h-6 text-blue-400" />
            </div>

            <div className="p-4 bg-amber-50/80 border border-amber-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Calving / Dry-Off</p>
                <p className="text-xl font-black text-amber-800">{actionSheet.calvingAndDryOff.length}</p>
              </div>
              <Baby className="w-6 h-6 text-amber-400" />
            </div>

            <div className="p-4 bg-purple-50/80 border border-purple-100 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-500">Heat Watch</p>
                <p className="text-xl font-black text-purple-800">{actionSheet.heatWatch.length}</p>
              </div>
              <Eye className="w-6 h-6 text-purple-400" />
            </div>
          </div>

          {/* Section 1: Injections & Treatments Due */}
          {(activeTab === 'all' || activeTab === 'treatments') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Injections & Health Treatments Scheduled Today ({actionSheet.treatments.length})</span>
                </h3>
              </div>

              {actionSheet.treatments.length === 0 ? (
                <div className="p-4 bg-white rounded-2xl border border-slate-100 text-center text-xs text-slate-400 font-bold">
                  No health injections scheduled for {currentDate}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {actionSheet.treatments.map((t) => (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        t.isCompletedToday
                          ? 'bg-emerald-50/60 border-emerald-200 text-slate-700'
                          : 'bg-white border-slate-200 hover:border-rose-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenAnimalProfile(t.animalId)}
                              className="text-base font-black text-slate-900 hover:text-blue-600 underline decoration-dotted"
                            >
                              Cow {t.animalTag}
                            </button>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                              {t.animalHerd}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                              t.isCompletedToday ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {t.dayProgress}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-rose-600 mt-1 flex items-center gap-1.5">
                            <Syringe className="w-3.5 h-3.5" />
                            <span>{t.medication}</span>
                          </p>
                          {t.clinicalSymptoms && (
                            <p className="text-[11px] text-slate-500 font-medium italic mt-0.5 line-clamp-1">
                              "{t.clinicalSymptoms}"
                            </p>
                          )}
                        </div>

                        {t.isCompletedToday ? (
                          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-xl text-[10px] font-black">
                            <Check className="w-3.5 h-3.5" />
                            <span>Administered</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onAdministerDose(t)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                          >
                            <Syringe className="w-3.5 h-3.5" />
                            <span>Administer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Pregnancy Checks Due */}
          {(activeTab === 'all' || activeTab === 'pd') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Pregnancy Checks Due ({actionSheet.pdChecks.length})</span>
                </h3>
              </div>

              {actionSheet.pdChecks.length === 0 ? (
                <div className="p-4 bg-white rounded-2xl border border-slate-100 text-center text-xs text-slate-400 font-bold">
                  No pregnancy checks due on {currentDate}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {actionSheet.pdChecks.map((p) => (
                    <div
                      key={p.animalId}
                      className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenAnimalProfile(p.animalId)}
                            className="text-base font-black text-slate-900 hover:text-blue-600 underline decoration-dotted"
                          >
                            Cow {p.animalTag}
                          </button>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            p.status === 'Overdue' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {p.daysPostAI}d post-AI
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-bold mt-1">
                          Semen: <span className="text-slate-800">{p.semenName}</span> • Tech: {p.technician}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenPdCheck(p.animalId)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>Perform PD</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Calving & Dry-Off */}
          {(activeTab === 'all' || activeTab === 'calving') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Calving & Dry-Off Actions ({actionSheet.calvingAndDryOff.length})</span>
                </h3>
              </div>

              {actionSheet.calvingAndDryOff.length === 0 ? (
                <div className="p-4 bg-white rounded-2xl border border-slate-100 text-center text-xs text-slate-400 font-bold">
                  No calving or dry-off actions due on {currentDate}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {actionSheet.calvingAndDryOff.map((c) => (
                    <div
                      key={`${c.animalId}-${c.type}`}
                      className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-amber-300 shadow-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenAnimalProfile(c.animalId)}
                            className="text-base font-black text-slate-900 hover:text-blue-600 underline decoration-dotted"
                          >
                            Cow {c.animalTag}
                          </button>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            c.type === 'Expected Calving' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {c.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-bold mt-1">
                          Pen: <span className="text-slate-800">{c.animalHerd}</span> • Target: {c.targetDate}
                        </p>
                      </div>

                      {onOpenMovePen && (
                        <button
                          type="button"
                          onClick={() => onOpenMovePen(c.animalId)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black rounded-xl shadow-xs transition-all flex items-center gap-1 active:scale-95"
                        >
                          <Building className="w-3.5 h-3.5" />
                          <span>Move Pen</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Heat Watch List */}
          {(activeTab === 'all' || activeTab === 'heat') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Estrus / Heat Watch (Repeat Cycle Window) ({actionSheet.heatWatch.length})</span>
                </h3>
              </div>

              {actionSheet.heatWatch.length === 0 ? (
                <div className="p-4 bg-white rounded-2xl border border-slate-100 text-center text-xs text-slate-400 font-bold">
                  No cows currently in the 18–24 day heat watch window
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {actionSheet.heatWatch.map((h) => (
                    <div
                      key={h.animalId}
                      className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-purple-300 shadow-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenAnimalProfile(h.animalId)}
                            className="text-base font-black text-slate-900 hover:text-blue-600 underline decoration-dotted"
                          >
                            Cow {h.animalTag}
                          </button>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md">
                            {h.reason}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-bold mt-1">
                          Pen: {h.animalHerd} • Last AI: {h.lastAIDate}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenAnimalProfile(h.animalId)}
                        className="p-2 text-slate-400 hover:text-purple-600 rounded-xl hover:bg-purple-50 transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 5: Protocol Steps */}
          {(activeTab === 'all' || activeTab === 'protocols') && actionSheet.protocols.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-500" />
                  <span>Synchronization Protocol Steps Today ({actionSheet.protocols.length})</span>
                </h3>
              </div>

              <div className="space-y-2">
                {actionSheet.protocols.map((pr, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-2xl border border-teal-100 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-teal-800">{pr.templateName}</span>
                        {pr.time && (
                          <span className="text-[10px] font-black bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {pr.time}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {pr.animalCount} Animals
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-800">{pr.action}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pr.animalTags.map(tag => (
                        <span key={tag} className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-bold hidden sm:block">
            Tip: Send to WhatsApp so farm staff receive the exact daily task list.
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
