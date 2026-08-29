import React from 'react';
import { X } from 'lucide-react';
import { Animal } from '../types';

interface PregnancyCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAnimal: Animal | null;
  result: 'Pregnant' | 'Non-Pregnant' | '';
  onSelectResult: (res: 'Pregnant' | 'Non-Pregnant') => void;
  onSave: () => void;
}

export const PregnancyCheckModal: React.FC<PregnancyCheckModalProps> = ({
  isOpen,
  onClose,
  targetAnimal,
  result,
  onSelectResult,
  onSave
}) => {
  if (!isOpen || !targetAnimal) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="px-8 py-6 border-b border-slate-100 bg-blue-50 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-800">Pregnancy Check</h3>
            <p className="text-xs text-blue-600 font-black uppercase tracking-widest mt-1">{targetAnimal.tag}</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-blue-100 rounded-2xl transition-all">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <p className="text-sm text-slate-600 font-semibold">Select the result of today's pregnancy examination:</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onSelectResult('Pregnant')}
              className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                result === 'Pregnant'
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="text-2xl">🤰</span>
              <span className="text-xs font-black uppercase tracking-wider">Pregnant</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectResult('Non-Pregnant')}
              className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                result === 'Non-Pregnant'
                  ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="text-2xl">❌</span>
              <span className="text-xs font-black uppercase tracking-wider">Open / Not Preg</span>
            </button>
          </div>
          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!result}
              onClick={onSave}
              className="flex-1 py-3.5 bg-blue-600 disabled:opacity-40 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              Save Result
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
