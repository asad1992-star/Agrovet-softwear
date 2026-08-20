import React, { useState } from 'react';
import { Plus, X, Package, Check, Sparkles, Building2, Calendar, FileText } from 'lucide-react';
import { Medicine, MedicinePurchase } from '../types';

interface QuickRestockModalProps {
  medicine: Medicine;
  isOpen: boolean;
  onClose: () => void;
  onRestock: (packsToAdd: number, looseToAdd: number, supplier?: string, notes?: string, invoiceNo?: string) => void;
}

export const QuickRestockModal: React.FC<QuickRestockModalProps> = ({
  medicine,
  isOpen,
  onClose,
  onRestock
}) => {
  const [packs, setPacks] = useState<number>(1);
  const [loose, setLoose] = useState<number>(0);
  const [supplier, setSupplier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [invoiceNo, setInvoiceNo] = useState<string>('');

  if (!isOpen) return null;

  const currentTotal = ((medicine.packs || 0) * (medicine.loosePerPack || 100)) + (medicine.loose || 0);
  const addedTotal = (packs * (medicine.loosePerPack || 100)) + loose;
  const newProjectedTotal = currentTotal + addedTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (packs <= 0 && loose <= 0) {
      alert('Please enter at least 1 pack or loose quantity to restock.');
      return;
    }
    onRestock(packs, loose, supplier.trim(), notes.trim(), invoiceNo.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-200 flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-200">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Quick Restock</h3>
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{medicine.name} ({medicine.category})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200/60 rounded-xl transition-all">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto">
          {/* Quick presets for packs */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">
              Quick Add Unopened Packs ({medicine.loosePerPack} {medicine.unit}/pack)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[1, 2, 5, 10].map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPacks(p)}
                  className={`py-2.5 rounded-xl text-xs font-black transition-all border ${
                    packs === p
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  +{p} Pack{p > 1 ? 's' : ''}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Unopened Packs</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={packs}
                  onChange={e => setPacks(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Loose / Open ({medicine.unit})</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={loose}
                  onChange={e => setLoose(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Stock Projection Preview */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Stock</p>
              <p className="text-sm font-black text-slate-700">{currentTotal} {medicine.unit}</p>
            </div>
            <div className="text-center font-black text-emerald-600 text-lg">
              + {addedTotal} {medicine.unit} →
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">New Total Stock</p>
              <p className="text-base font-black text-emerald-800">{newProjectedTotal} {medicine.unit}</p>
            </div>
          </div>

          {/* Supplier & Details */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Supplier / Vendor (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. VetCare Distributors"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold shadow-inner outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Invoice / Batch # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-8821 / B#09"
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold shadow-inner outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Restock Notes</label>
              <input
                type="text"
                placeholder="e.g. Regular monthly inventory replenishment"
                value={notes}
                onChange={e => setNotes(e.target.value)}
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
              className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Confirm Restock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
