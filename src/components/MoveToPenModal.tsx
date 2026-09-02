import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  ArrowRightLeft,
  Warehouse,
  Users,
  User,
  Filter,
  CheckCheck,
  XCircle,
  Sparkles,
  Info,
  MapPin,
  Tag,
  ChevronDown
} from 'lucide-react';
import { Animal, AnimalStatus, FarmSettings } from '../types';
import { getAllAvailablePens } from '../services/businessLogic';

interface MoveToPenModalProps {
  isOpen: boolean;
  onClose: () => void;
  animals: Animal[];
  settings: FarmSettings;
  initialSelectedAnimalId?: string | null;
  onConfirmMove: (animalIds: string[], targetGroup: string, reason?: string) => void;
}

const DEFAULT_GROUPS = ['Main Herd', 'Growing Heifers', 'Post Weaning', 'Suckling', 'Elite', 'High Group', 'Medium Group', 'Breeding Pen', 'Dry Cows'];

const getStatusColorBadge = (status?: AnimalStatus) => {
  switch (status) {
    case AnimalStatus.PREGNANT: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case AnimalStatus.YOUNG_STOCK: return 'bg-orange-50 text-orange-700 border-orange-200';
    case AnimalStatus.SICK: return 'bg-rose-50 text-rose-700 border-rose-200';
    case AnimalStatus.IN_PROTOCOL: return 'bg-amber-50 text-amber-700 border-amber-200';
    case AnimalStatus.INSEMINATED: return 'bg-blue-50 text-blue-700 border-blue-200';
    case AnimalStatus.DRY: return 'bg-slate-100 text-slate-700 border-slate-300';
    case AnimalStatus.CLOSEUP: return 'bg-purple-50 text-purple-700 border-purple-200';
    case AnimalStatus.OBSERVATION: return 'bg-slate-50 text-slate-500 border-slate-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const COMMON_REASONS = [
  'Routine Pen Rotation',
  'Maternity & Calving Prep',
  'Dry Off Group',
  'Breeding Group',
  'High Yield Group',
  'Medical Isolation / Care',
  'Weaning Separation'
];

export const MoveToPenModal: React.FC<MoveToPenModalProps> = ({
  isOpen,
  onClose,
  animals,
  settings,
  initialSelectedAnimalId,
  onConfirmMove
}) => {
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple'>('single');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('');
  const [selectedMultipleIds, setSelectedMultipleIds] = useState<string[]>([]);
  const [targetGroup, setTargetGroup] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sourceGroupFilter, setSourceGroupFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const groupsList = useMemo(() => {
    const list = getAllAvailablePens(settings, animals);
    return list.length > 0 ? list : DEFAULT_GROUPS;
  }, [settings, animals]);

  // Pen headcounts
  const penCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    groupsList.forEach(g => { counts[g] = 0; });
    animals.forEach(a => {
      const g = a.herd || 'Unassigned';
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [animals, groupsList]);

  // Sync initial animal when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedAnimalId) {
        setSelectionMode('single');
        setSelectedAnimalId(initialSelectedAnimalId);
        setSelectedMultipleIds([initialSelectedAnimalId]);
        const matched = animals.find(a => a.id === initialSelectedAnimalId);
        // default target group to next group or first group that isn't their current herd
        if (matched) {
          const altGroup = groupsList.find(g => g !== matched.herd) || groupsList[0] || '';
          setTargetGroup(altGroup);
        } else {
          setTargetGroup(groupsList[0] || '');
        }
      } else {
        setSelectedAnimalId('');
        setSelectedMultipleIds([]);
        setTargetGroup(groupsList[0] || '');
      }
      setSearchQuery('');
      setSourceGroupFilter('All');
      setStatusFilter('All');
      setTransferReason('');
    }
  }, [isOpen, initialSelectedAnimalId, animals, groupsList]);

  // Filtered animals for multi/single picker
  const filteredAnimals = useMemo(() => {
    return animals.filter(a => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTag = a.tag.toLowerCase().includes(q);
        const matchBreed = a.breed?.toLowerCase().includes(q);
        const matchName = a.name?.toLowerCase().includes(q);
        const matchHerd = a.herd?.toLowerCase().includes(q);
        if (!matchTag && !matchBreed && !matchName && !matchHerd) return false;
      }
      if (sourceGroupFilter !== 'All' && (a.herd || 'Unassigned') !== sourceGroupFilter) {
        return false;
      }
      if (statusFilter !== 'All' && a.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [animals, searchQuery, sourceGroupFilter, statusFilter]);

  if (!isOpen) return null;

  const activeSelectedIds = selectionMode === 'single'
    ? (selectedAnimalId ? [selectedAnimalId] : [])
    : selectedMultipleIds;

  const selectedAnimalsList = animals.filter(a => activeSelectedIds.includes(a.id));

  const handleToggleAnimal = (id: string) => {
    if (selectionMode === 'single') {
      setSelectedAnimalId(id);
    } else {
      setSelectedMultipleIds(prev =>
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredAnimals.map(a => a.id);
    const newSet = new Set([...selectedMultipleIds, ...filteredIds]);
    setSelectedMultipleIds(Array.from(newSet));
  };

  const handleDeselectAll = () => {
    setSelectedMultipleIds([]);
  };

  const handleSelectByGroup = (groupName: string) => {
    const groupAnimalIds = animals.filter(a => a.herd === groupName).map(a => a.id);
    setSelectedMultipleIds(groupAnimalIds);
    setSelectionMode('multiple');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSelectedIds.length === 0) {
      alert('Please select at least one animal to move.');
      return;
    }
    if (!targetGroup) {
      alert('Please select a destination pen/group.');
      return;
    }
    onConfirmMove(activeSelectedIds, targetGroup, transferReason);
    onClose();
  };

  return (
    <div
      id="move-to-pen-modal-overlay"
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-3xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-0 sm:my-auto max-h-[94vh] sm:max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 sm:px-8 pt-5 sm:pt-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
              <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">
                  Move to Pen / Group
                </h3>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Batch Manager
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
                Relocate single or batch animals into your farm pens.
              </p>
            </div>
          </div>

          <button
            id="close-move-pen-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-8 overflow-y-auto space-y-5 sm:space-y-6 flex-1 overscroll-contain">
          {/* Step 1: Mode Switcher (Single vs Multi) */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 px-1">
              1. Transfer Scope
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                id="mode-single-animal-btn"
                onClick={() => setSelectionMode('single')}
                className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  selectionMode === 'single'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Single Animal
              </button>
              <button
                type="button"
                id="mode-multi-animal-btn"
                onClick={() => {
                  setSelectionMode('multiple');
                  if (selectedAnimalId && !selectedMultipleIds.includes(selectedAnimalId)) {
                    setSelectedMultipleIds(prev => [...prev, selectedAnimalId]);
                  }
                }}
                className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  selectionMode === 'multiple'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Multiple (Batch)
              </button>
            </div>
          </div>

          {/* Step 2: Destination Pen Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-blue-500" />
                2. Target Destination Pen *
              </label>
              <span className="text-[10px] font-bold text-slate-400">
                {groupsList.length} pens available
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {groupsList.map(group => {
                const count = penCounts[group] || 0;
                const isSelected = targetGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setTargetGroup(group)}
                    className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className={`text-xs font-black tracking-tight leading-tight ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                        {group}
                      </span>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-400">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{count} {count === 1 ? 'cow' : 'cows'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Animal Picker */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                3. Select Animal{selectionMode === 'multiple' ? 's to Relocate' : ' *'}
              </label>

              {selectionMode === 'multiple' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" /> Select Filtered ({filteredAnimals.length})
                  </button>
                  {selectedMultipleIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-[10px] font-black text-slate-500 hover:text-rose-600 uppercase tracking-wider bg-slate-100 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tag, breed, pen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <select
                value={sourceGroupFilter}
                onChange={(e) => setSourceGroupFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="All">All Current Pens</option>
                {groupsList.map(g => (
                  <option key={g} value={g}>From: {g} ({penCounts[g] || 0})</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="All">All Life Statuses</option>
                {Object.values(AnimalStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Animals Selection Scrollable Area */}
            <div className="max-h-48 sm:max-h-56 overflow-y-auto border border-slate-200/80 rounded-2xl p-2 bg-slate-50/50 space-y-1.5 overscroll-contain">
              {filteredAnimals.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-bold">
                  No animals match your filter criteria.
                </div>
              ) : (
                filteredAnimals.map(animal => {
                  const isChecked = selectionMode === 'single'
                    ? selectedAnimalId === animal.id
                    : selectedMultipleIds.includes(animal.id);
                  const isAlreadyInTarget = animal.herd === targetGroup;

                  return (
                    <div
                      key={animal.id}
                      onClick={() => handleToggleAnimal(animal.id)}
                      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-white border-blue-400 shadow-xs'
                          : 'bg-white/70 border-slate-100 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                            isChecked
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-800">{animal.tag}</span>
                            {animal.name && (
                              <span className="text-[10px] font-bold text-slate-500 truncate max-w-[80px]">({animal.name})</span>
                            )}
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${getStatusColorBadge(animal.status)}`}>
                              {animal.status || 'Active'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium truncate">
                            {animal.breed} • Currently in <strong className="text-slate-600">{animal.herd || 'Unassigned'}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isAlreadyInTarget ? (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            Current
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">
                            ➔ {targetGroup || 'Target'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Pills (for Multiple mode) */}
            {selectionMode === 'multiple' && selectedMultipleIds.length > 0 && (
              <div className="p-2.5 sm:p-3 bg-blue-50/70 rounded-2xl border border-blue-100">
                <div className="flex items-center justify-between text-[11px] font-black text-blue-900 mb-1.5">
                  <span>Selected ({selectedMultipleIds.length} animals):</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[10px] font-bold text-blue-600 hover:text-rose-600 cursor-pointer"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {selectedAnimalsList.map(a => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 bg-white border border-blue-200 px-2 py-0.5 rounded-lg text-[10px] font-black text-blue-800"
                    >
                      {a.tag}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAnimal(a.id);
                        }}
                        className="text-blue-400 hover:text-rose-500 rounded-full cursor-pointer ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 4: Transfer Reason & Notes */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">
              4. Transfer Reason (Optional)
            </label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {COMMON_REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTransferReason(r)}
                  className={`text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    transferReason === r
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="e.g., Scheduled estrus sync or calving prep..."
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Transfer Summary Preview */}
          {activeSelectedIds.length > 0 && targetGroup && (
            <div className="p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="text-xs font-black text-emerald-900">
                    Moving {activeSelectedIds.length} {activeSelectedIds.length === 1 ? 'animal' : 'animals'}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-emerald-700 font-medium truncate">
                    Destination: <strong className="font-black text-emerald-900">{targetGroup}</strong>
                  </p>
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-200/80 text-emerald-900 px-2.5 py-1 rounded-full shrink-0">
                {activeSelectedIds.length} Selected
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 pb-2 flex items-center justify-end gap-2.5 border-t border-slate-100 sticky bottom-0 bg-white z-10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-3.5 bg-slate-100 text-slate-700 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              id="confirm-move-to-pen-btn"
              type="submit"
              disabled={activeSelectedIds.length === 0 || !targetGroup}
              className="flex-[2] sm:flex-none px-6 sm:px-8 py-3.5 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Confirm Move ({activeSelectedIds.length})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
