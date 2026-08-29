import React from 'react';
import { X, Syringe } from 'lucide-react';

interface DoseAdministrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    healthEventId: string;
    animalId: string;
    animalTag?: string;
    medication?: string;
    dayNumber?: number;
    totalDays?: number;
    doseDate?: string;
    treatments?: any[];
  } | null;
  onConfirm: (healthEventId: string, doseDate: string) => void;
}

export const DoseAdministrationModal: React.FC<DoseAdministrationModalProps> = ({
  isOpen,
  onClose,
  data,
  onConfirm
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="px-8 py-6 border-b border-slate-100 bg-emerald-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-sm">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Administer Dose</h3>
              <p className="text-xs text-emerald-700 font-black uppercase tracking-widest mt-0.5">
                Cow {data.animalTag} • {data.dayNumber ? `Day ${data.dayNumber} of ${data.totalDays}` : 'Scheduled Dose'}
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
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Prescribed Medication</p>
            <p className="text-base font-black text-slate-800">{data.medication || 'Course Medication'}</p>
            {data.treatments && data.treatments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {data.treatments.map((t: any, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                    {t.name} {t.dose ? `(${t.dose})` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Confirming will record dose administration for today and automatically deduct the required dosage from inventory stock.
          </p>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(data.healthEventId, data.doseDate || new Date().toISOString().split('T')[0])}
              className="flex-1 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
            >
              Confirm Dose
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
