import React, { useState } from 'react';
import { Minus, X, Syringe, AlertTriangle, User, FileText, Check } from 'lucide-react';
import { Medicine } from '../types';

interface QuickDispenseModalProps {
  medicine: Medicine;
  isOpen: boolean;
  onClose: () => void;
  onDispense: (amountToDeduct: number, reason: string, patientTag?: string) => void;
}

export const QuickDispenseModal: React.FC<QuickDispenseModalProps> = ({
  medicine,
  isOpen,
  onClose,
  onDispense
}) => {
  const [amount, setAmount] = useState<number>(10);
  const [reason, setReason] = useState<string>('Clinical Treatment');
  const [patientTag, setPatientTag] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  if (!isOpen) return null;

  const currentTotal = ((medicine.packs || 0) * (medicine.loosePerPack || 100)) + (medicine.loose || 0);
  const remainingTotal = Math.max(0, currentTotal - amount);
  const isInsufficient = amount > currentTotal;
  const isProjectedLow = remainingTotal < (medicine.minStockLevel || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }
    const finalReason = reason === 'Other' ? (customReason || 'Manual Deduction') : reason;
    onDispense(amount, finalReason, patientTag.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-200 flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-md shadow-rose-200">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Dispense / Deduct Stock</h3>
              <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">{medicine.name} ({medicine.category})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200/60 rounded-xl transition-all">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto">
          {/* Quick presets for amounts */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">
              Quick Select Amount ({medicine.unit})
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[2, 5, 10, 20].map(val => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`py-2.5 rounded-xl text-xs font-black transition-all border ${
                    amount === val
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {val} {medicine.unit}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Deduction Amount ({medicine.unit}) *
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={amount}
                onChange={e => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>

          {/* Stock Projection Preview */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            isInsufficient 
              ? 'bg-rose-50 border-rose-200' 
              : isProjectedLow 
              ? 'bg-amber-50 border-amber-200' 
              : 'bg-slate-50 border-slate-100'
          }`}>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Stock</p>
              <p className="text-sm font-black text-slate-700">{currentTotal} {medicine.unit}</p>
            </div>
            <div className="text-center font-black text-rose-600 text-lg">
              - {amount} {medicine.unit} →
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Projected Remaining</p>
              <p className={`text-base font-black ${isInsufficient || isProjectedLow ? 'text-rose-600' : 'text-slate-800'}`}>
                {remainingTotal} {medicine.unit}
              </p>
            </div>
          </div>

          {isInsufficient && (
            <div className="p-3 bg-rose-100/70 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>Requested amount ({amount} {medicine.unit}) exceeds current inventory ({currentTotal} {medicine.unit}). All remaining stock will be exhausted.</span>
            </div>
          )}

          {/* Reason and Target Cow */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Dispensation Reason</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none"
              >
                <option value="Clinical Treatment">🩺 Clinical Treatment</option>
                <option value="Protocol Injection">⚡ Synchronization Protocol Step</option>
                <option value="Herd Mass Vaccination">💉 Herd Vaccination / Deworming</option>
                <option value="Wastage / Spoilage">⚠️ Wastage / Broken Vial / Spoilage</option>
                <option value="Expired Stock Removal">🗑️ Expired Stock Disposal</option>
                <option value="Other">📝 Other / Manual Stock Adjustment</option>
              </select>
            </div>

            {reason === 'Other' && (
              <div className="space-y-1 animate-in fade-in duration-200">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Specify Custom Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Broken during transport"
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold shadow-inner outline-none"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" /> Animal Patient Tag (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Cow_45 (if dispensed to specific cow)"
                value={patientTag}
                onChange={e => setPatientTag(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold shadow-inner outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
            >
              <Minus className="w-4 h-4" /> Confirm Deduction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
