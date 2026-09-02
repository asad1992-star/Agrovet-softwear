import React from 'react';
import {
  X,
  Plus,
  Users,
  Baby,
  CalendarRange,
  Stethoscope,
  Pill,
  ClipboardList,
  Sparkles,
  ArrowRightLeft,
  Search,
  TrendingUp,
  Activity,
  Layers,
  Heart
} from 'lucide-react';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAnimal: () => void;
  onAddCalf: () => void;
  onLogInsemination: () => void;
  onLogPregnancyCheck: () => void;
  onLogCalving: () => void;
  onLogHeat: () => void;
  onLogHealthEvent: () => void;
  onAddMedicine: () => void;
  onOpenActionSheet: () => void;
  onOpenMovePen: () => void;
  onOpenFertilityAnalytics: () => void;
  onOpenProtocolEnrollment: () => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  onAddAnimal,
  onAddCalf,
  onLogInsemination,
  onLogPregnancyCheck,
  onLogCalving,
  onLogHeat,
  onLogHealthEvent,
  onAddMedicine,
  onOpenActionSheet,
  onOpenMovePen,
  onOpenFertilityAnalytics,
  onOpenProtocolEnrollment
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6 animate-in slide-in-from-bottom-6 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Quick Action Command</h3>
              <p className="text-xs font-bold text-slate-400">Select any operation to launch immediately</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Animal & Herd Records */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
            Herd & Livestock Records
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => {
                onClose();
                onAddAnimal();
              }}
              className="p-3.5 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-100 rounded-2xl text-left space-y-1.5 transition-all group active:scale-95 shadow-xs flex flex-col justify-between"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Add Cow / Heifer</p>
                <p className="text-[10px] font-bold text-blue-700">Register new adult stock</p>
              </div>
            </button>

            <button
              onClick={() => {
                onClose();
                onAddCalf();
              }}
              className="p-3.5 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-100 rounded-2xl text-left space-y-1.5 transition-all group active:scale-95 shadow-xs flex flex-col justify-between"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <Baby className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Register Calf</p>
                <p className="text-[10px] font-bold text-amber-700">Newborn entry in Calf Hutch</p>
              </div>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenMovePen();
              }}
              className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left space-y-1.5 transition-all group active:scale-95 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Move to Pen</p>
                <p className="text-[10px] font-bold text-slate-600">Transfer group or batch move</p>
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: Reproduction & Breeding Events */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
            Reproduction & Breeding
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => {
                onClose();
                onLogInsemination();
              }}
              className="p-3 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-100 rounded-2xl text-left space-y-1 transition-all group active:scale-95 shadow-xs"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <CalendarRange className="w-4 h-4" />
              </div>
              <p className="text-xs font-black text-slate-900">Insemination (AI)</p>
              <p className="text-[9px] font-bold text-indigo-700">Record straw & tech</p>
            </button>

            <button
              onClick={() => {
                onClose();
                onLogPregnancyCheck();
              }}
              className="p-3 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-100 rounded-2xl text-left space-y-1 transition-all group active:scale-95 shadow-xs"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <Search className="w-4 h-4" />
              </div>
              <p className="text-xs font-black text-slate-900">Pregnancy (PD)</p>
              <p className="text-[9px] font-bold text-emerald-700">Diagnose +/- result</p>
            </button>

            <button
              onClick={() => {
                onClose();
                onLogCalving();
              }}
              className="p-3 bg-purple-50/80 hover:bg-purple-100 border border-purple-100 rounded-2xl text-left space-y-1 transition-all group active:scale-95 shadow-xs"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <Heart className="w-4 h-4" />
              </div>
              <p className="text-xs font-black text-slate-900">Log Calving</p>
              <p className="text-[9px] font-bold text-purple-700">Parturition & calf record</p>
            </button>

            <button
              onClick={() => {
                onClose();
                onLogHeat();
              }}
              className="p-3 bg-rose-50/80 hover:bg-rose-100 border border-rose-100 rounded-2xl text-left space-y-1 transition-all group active:scale-95 shadow-xs"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <Activity className="w-4 h-4" />
              </div>
              <p className="text-xs font-black text-slate-900">Heat Detection</p>
              <p className="text-[9px] font-bold text-rose-700">Natural estrus observation</p>
            </button>
          </div>
        </div>

        {/* Section 3: Veterinary Health & Pharmacy */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
            Clinical Veterinary & Pharmacy
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => {
                onClose();
                onLogHealthEvent();
              }}
              className="p-3.5 bg-rose-50/80 hover:bg-rose-100 border border-rose-100 rounded-2xl text-left space-y-1.5 transition-all group active:scale-95 shadow-xs flex flex-col justify-between"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Clinical Treatment</p>
                <p className="text-[10px] font-bold text-rose-700">Record illness & doses</p>
              </div>
            </button>

            <button
              onClick={() => {
                onClose();
                onAddMedicine();
              }}
              className="p-3.5 bg-teal-50/80 hover:bg-teal-100 border border-teal-100 rounded-2xl text-left space-y-1.5 transition-all group active:scale-95 shadow-xs flex flex-col justify-between"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Register Medicine</p>
                <p className="text-[10px] font-bold text-teal-700">Add drug to inventory</p>
              </div>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenProtocolEnrollment();
              }}
              className="p-3.5 bg-blue-50/80 hover:bg-blue-100 border border-blue-100 rounded-2xl text-left space-y-1.5 transition-all group active:scale-95 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Protocol Enrollment</p>
                <p className="text-[10px] font-bold text-blue-700">Enroll cow in heat synch</p>
              </div>
            </button>
          </div>
        </div>

        {/* Section 4: Command Center Utilities */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={() => {
              onClose();
              onOpenActionSheet();
            }}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-left space-y-1 transition-all flex items-center gap-3 shadow-lg shadow-slate-900/10 active:scale-95"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black">Daily Action Sheet</p>
              <p className="text-[9px] font-bold text-emerald-300">Today's vet task list</p>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenFertilityAnalytics();
            }}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-left space-y-1 transition-all flex items-center gap-3 shadow-lg shadow-slate-900/10 active:scale-95"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black">Fertility Analytics</p>
              <p className="text-[9px] font-bold text-blue-300">Conception rates & trends</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
