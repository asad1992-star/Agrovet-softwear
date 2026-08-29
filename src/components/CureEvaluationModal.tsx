import React from 'react';
import { X, Stethoscope, CheckCheck, AlertTriangle } from 'lucide-react';

interface CureEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    healthEventId: string;
    animalId: string;
    medication?: string;
    animalTag?: string;
  } | null;
  onEvaluate: (healthEventId: string, isCuredOutcome: boolean) => void;
}

export const CureEvaluationModal: React.FC<CureEvaluationModalProps> = ({
  isOpen,
  onClose,
  data,
  onEvaluate
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="px-8 py-6 border-b border-slate-100 bg-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Cure Evaluation</h3>
              <p className="text-xs text-amber-700 font-black uppercase tracking-widest mt-0.5">
                Treatment Ended • Cow {data.animalTag}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all shadow-xs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-black text-slate-800">Has Cow {data.animalTag} completely recovered?</p>
            <p className="text-xs text-slate-500 font-semibold">
              Select Cured to restore the cow health status to Normal, or Not Cured if she remains sick.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onEvaluate(data.healthEventId, true)}
              className="p-5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-2 border-emerald-300 hover:border-emerald-500 rounded-2xl flex flex-col items-center gap-2 transition-all group"
            >
              <CheckCheck className="w-7 h-7 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-black uppercase tracking-wider">Cured</span>
              <span className="text-[10px] text-emerald-600/80 font-bold">Status: Normal</span>
            </button>

            <button
              type="button"
              onClick={() => onEvaluate(data.healthEventId, false)}
              className="p-5 bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-300 hover:border-rose-500 rounded-2xl flex flex-col items-center gap-2 transition-all group"
            >
              <AlertTriangle className="w-7 h-7 text-rose-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-black uppercase tracking-wider">Not Cured</span>
              <span className="text-[10px] text-rose-600/80 font-bold">Status: Sick</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
