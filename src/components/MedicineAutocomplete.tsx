import React, { useState, useEffect, useRef } from 'react';
import { Pill, Syringe, Beaker, Check, Plus, AlertTriangle, Package, ChevronDown } from 'lucide-react';
import { Medicine } from '../types';

interface MedicineAutocompleteProps {
  value: string;
  onChange: (value: string, selectedMed?: Medicine) => void;
  medicines: Medicine[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const MedicineAutocomplete: React.FC<MedicineAutocompleteProps> = ({
  value,
  onChange,
  medicines,
  placeholder = 'Type medicine name (e.g. ketoject)...',
  className = '',
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const query = (value || '').trim().toLowerCase();

  // Smart filtering & sorting:
  // 1. Medicines whose name starts with query
  // 2. Medicines where a word inside starts with query
  // 3. Medicines whose name contains query
  const filteredMedicines = React.useMemo(() => {
    if (!medicines || medicines.length === 0) return [];
    if (!query) return medicines;

    const startsWithQuery: Medicine[] = [];
    const wordStartsWithQuery: Medicine[] = [];
    const containsQuery: Medicine[] = [];

    medicines.forEach(m => {
      const nameLower = (m.name || '').toLowerCase();
      if (nameLower.startsWith(query)) {
        startsWithQuery.push(m);
      } else if (nameLower.split(/\s+/).some(w => w.startsWith(query))) {
        wordStartsWithQuery.push(m);
      } else if (nameLower.includes(query) || (m.category || '').toLowerCase().includes(query)) {
        containsQuery.push(m);
      }
    });

    const sortFn = (a: Medicine, b: Medicine) => a.name.localeCompare(b.name);
    startsWithQuery.sort(sortFn);
    wordStartsWithQuery.sort(sortFn);
    containsQuery.sort(sortFn);

    return [...startsWithQuery, ...wordStartsWithQuery, ...containsQuery];
  }, [medicines, query]);

  // Find currently selected medicine object if exact match
  const selectedMedicine = React.useMemo(() => {
    if (!value) return null;
    return medicines.find(m => m.name.toLowerCase() === value.trim().toLowerCase()) || null;
  }, [medicines, value]);

  const handleSelect = (med: Medicine) => {
    onChange(med.name, med);
    setIsOpen(false);
  };

  const handleCustomSelect = () => {
    if (value.trim()) {
      onChange(value.trim());
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredMedicines.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredMedicines.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredMedicines[highlightedIndex]) {
        handleSelect(filteredMedicines[highlightedIndex]);
      } else if (value.trim()) {
        handleCustomSelect();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('inject')) return <Syringe className="w-3.5 h-3.5 text-rose-500" />;
    if (cat.includes('powder')) return <Beaker className="w-3.5 h-3.5 text-amber-500" />;
    return <Pill className="w-3.5 h-3.5 text-blue-500" />;
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input Field */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-black text-slate-800 placeholder:text-slate-400 shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          onChange={e => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(prev => !prev);
            inputRef.current?.focus();
          }}
          className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
          tabIndex={-1}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Selected Medicine Info Badge (Stock & Packing) */}
      {selectedMedicine && (
        <div className="mt-2 px-3 py-2 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex flex-wrap items-center justify-between text-xs gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-emerald-950">{selectedMedicine.name}</span>
            <span className="text-emerald-300">•</span>
            <span className="font-semibold text-emerald-800">
              Packing: <strong className="text-emerald-950">{selectedMedicine.loosePerPack} {selectedMedicine.unit}/pack</strong>
            </span>
            <span className="text-emerald-300">•</span>
            <span className="font-semibold text-emerald-800">
              Available: <strong className="text-emerald-950">{selectedMedicine.packs} pk</strong> {selectedMedicine.loose > 0 ? `+ ${selectedMedicine.loose} ${selectedMedicine.unit}` : ''} ({((selectedMedicine.packs * selectedMedicine.loosePerPack) + selectedMedicine.loose)} {selectedMedicine.unit} total)
            </span>
          </div>
          {(() => {
            const totalUnits = (selectedMedicine.packs * selectedMedicine.loosePerPack) + selectedMedicine.loose;
            const isOutOfStock = totalUnits === 0;
            const isLowStock = totalUnits > 0 && totalUnits < selectedMedicine.minStockLevel;
            if (isOutOfStock) {
              return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-black text-[9px] uppercase border border-rose-200">Out of Stock</span>;
            }
            if (isLowStock) {
              return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[9px] uppercase border border-amber-200">Low Stock ({totalUnits} {selectedMedicine.unit})</span>;
            }
            return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[9px] uppercase border border-emerald-200">In Stock ({totalUnits} {selectedMedicine.unit})</span>;
          })()}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[100] left-0 w-[calc(100vw-3.5rem)] sm:w-[460px] max-w-[500px] top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between sticky top-0 backdrop-blur-sm z-10">
            <span className="flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-rose-500" />
              {query ? (
                <span>Matches for <strong className="text-slate-800">"{query}"</strong> ({filteredMedicines.length})</span>
              ) : (
                <span>All Registered Inventory Medicines ({medicines.length})</span>
              )}
            </span>
            <span className="text-[9px] font-semibold text-slate-400 lowercase">click or enter to select</span>
          </div>

          {/* Matches List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {filteredMedicines.map((med, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isExactMatch = selectedMedicine?.id === med.id;
              const totalUnits = (med.packs * med.loosePerPack) + med.loose;
              const isOutOfStock = totalUnits === 0;
              const isLowStock = totalUnits > 0 && totalUnits < med.minStockLevel;

              // Highlight prefix if matches
              const nameLower = med.name.toLowerCase();
              const prefixIndex = query ? nameLower.indexOf(query) : -1;

              return (
                <button
                  key={med.id}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(med)}
                  className={`w-full px-4 py-3 text-left transition-colors flex items-start gap-3 group cursor-pointer ${
                    isHighlighted ? 'bg-rose-50/80' : isExactMatch ? 'bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    {getCategoryIcon(med.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* Full Name & Category Tag - NO TRUNCATE! */}
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug group-hover:text-rose-600 transition-colors">
                        {prefixIndex >= 0 ? (
                          <>
                            {med.name.slice(0, prefixIndex)}
                            <span className="text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded font-black border border-emerald-200">
                              {med.name.slice(prefixIndex, prefixIndex + query.length)}
                            </span>
                            {med.name.slice(prefixIndex + query.length)}
                          </>
                        ) : (
                          med.name
                        )}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        {med.category}
                      </span>
                    </div>

                    {/* Stock & Packing info line */}
                    <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-1.5 flex-wrap">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Packing: <strong className="text-slate-900 font-black">{med.loosePerPack} {med.unit}/pack</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-bold">
                          Stock: <strong className="text-slate-900 font-black">{med.packs} pk</strong> {med.loose > 0 ? `+ ${med.loose} ${med.unit}` : ''}
                        </span>
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                            Low ({totalUnits} {med.unit})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                            In Stock ({totalUnits} {med.unit})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* No matches / custom medicine fallback option */}
          {filteredMedicines.length === 0 && (
            <div className="p-5 text-center space-y-2.5">
              <p className="text-xs text-slate-500 font-bold">No registered medicines found matching "{value}"</p>
              {value.trim() && (
                <button
                  type="button"
                  onClick={handleCustomSelect}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black shadow-sm hover:bg-rose-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Use "{value.trim()}" as custom medication
                </button>
              )}
            </div>
          )}

          {/* Always provide custom option if user typed something not matching any medicine name exactly */}
          {filteredMedicines.length > 0 && query && !medicines.some(m => m.name.toLowerCase() === query) && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCustomSelect}
                className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Use custom entry: <strong className="font-black underline">"{value.trim()}"</strong></span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
