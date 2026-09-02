import React, { useState } from 'react';
import {
  Warehouse,
  ArrowRightLeft,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  RotateCcw,
  ShieldCheck,
  Zap,
  Layers,
  Baby,
  Milk,
  HeartPulse,
  HeartHandshake
} from 'lucide-react';
import { FarmSettings, PenCategory, PenMapping, Animal, ReproductionEvent, PenMovement } from '../types';
import { DEFAULT_PEN_MAPPING } from '../services/storage';
import { syncHerdPens, HerdSyncResult } from '../services/businessLogic';

interface PenSettingsSectionProps {
  settings: FarmSettings;
  updateSettings: (settings: FarmSettings) => void;
  animals: Animal[];
  reproEvents: ReproductionEvent[];
  penMovements: PenMovement[];
  onAnimalsUpdated?: (updatedAnimals: Animal[], newMovements: PenMovement[]) => void;
  onShowToast: (message: string) => void;
}

interface CategoryConfig {
  key: PenCategory;
  label: string;
  badgeColor: string;
  icon: React.ElementType;
  description: string;
  defaultName: string;
  triggerInfo: string;
}

const PEN_CATEGORIES: CategoryConfig[] = [
  {
    key: 'fresh',
    label: 'Fresh (Just Calved)',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Milk,
    description: 'Mother cows immediately after calving (Fresh phase, Days in Milk 0–30)',
    defaultName: 'Fresh',
    triggerInfo: 'Auto-moves dam on Calving event & sets status to Active'
  },
  {
    key: 'sucklingCalves',
    label: 'Suckling Calves',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Baby,
    description: 'Newborn & milk-fed young calves',
    defaultName: 'Suckling Calves',
    triggerInfo: 'Auto-assigned to newly registered calves on Calving event'
  },
  {
    key: 'highLactating',
    label: 'High Lactating',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Sparkles,
    description: 'Peak production milking herd group',
    defaultName: 'High Lactating',
    triggerInfo: 'Standard milking group for high-yield dairy cows'
  },
  {
    key: 'mediumLactating',
    label: 'Medium Lactating',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Layers,
    description: 'Mid-lactation milking group',
    defaultName: 'Medium Lactating',
    triggerInfo: 'Standard milking group for mid-yield dairy cows'
  },
  {
    key: 'lowLactating',
    label: 'Low Lactating',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: Warehouse,
    description: 'Late-lactation milking group preparing for dry-off',
    defaultName: 'Low Lactating',
    triggerInfo: 'Late lactation cows before dry-off'
  },
  {
    key: 'dryLactating',
    label: 'Dry Lactating (Dry Cows)',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: HeartPulse,
    description: 'Dry period cows before next calving',
    defaultName: 'Dry Lactating',
    triggerInfo: 'Auto-moves cow on Dry-Off event & sets status to Dry'
  },
  {
    key: 'pregnantHeifers',
    label: 'Pregnant Heifers',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: HeartHandshake,
    description: 'Confirmed pregnant heifers (first gestation)',
    defaultName: 'Pregnant Heifers',
    triggerInfo: 'Auto-moves breedable heifers on Positive PD (+ve) check'
  },
  {
    key: 'breedableHeifers',
    label: 'Breedable Heifers',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
    icon: Zap,
    description: 'Breeding-age heifers ready for AI / natural service',
    defaultName: 'Breedable Heifers',
    triggerInfo: 'Heifers eligible for insemination'
  },
  {
    key: 'growingHeifers',
    label: 'Growing Heifers',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: Layers,
    description: 'Growing juvenile heifers (post-weaning to breeding age)',
    defaultName: 'Growing Heifers',
    triggerInfo: 'Developing young stock'
  },
  {
    key: 'postWeanedHeifers',
    label: 'Post Weaned Heifers',
    badgeColor: 'bg-lime-50 text-lime-700 border-lime-200',
    icon: Warehouse,
    description: 'Transition heifers immediately after weaning off milk',
    defaultName: 'Post Weaned Heifers',
    triggerInfo: 'Weaned calves transitioning to solid diet'
  }
];

export const PenSettingsSection: React.FC<PenSettingsSectionProps> = ({
  settings,
  updateSettings,
  animals,
  reproEvents,
  penMovements,
  onAnimalsUpdated,
  onShowToast
}) => {
  const currentMapping: PenMapping = {
    ...DEFAULT_PEN_MAPPING,
    ...(settings.penMapping || {})
  };

  const [isSyncingHerd, setIsSyncingHerd] = useState(false);
  const [syncReport, setSyncReport] = useState<HerdSyncResult | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const handlePenNameChange = (key: PenCategory, value: string) => {
    const updatedMapping = {
      ...currentMapping,
      [key]: value
    };
    updateSettings({
      ...settings,
      penMapping: updatedMapping
    });
  };

  const handleResetToDefault = (key: PenCategory, defaultVal: string) => {
    handlePenNameChange(key, defaultVal);
    onShowToast(`Reset "${key}" pen name to default: "${defaultVal}"`);
  };

  const handleToggleAutoMoveHeifer = () => {
    const nextVal = settings.autoMoveHeiferOnPD === undefined ? false : !settings.autoMoveHeiferOnPD;
    updateSettings({
      ...settings,
      autoMoveHeiferOnPD: nextVal
    });
    onShowToast(
      nextVal
        ? 'Enabled: Breedable heifers will auto-move to Pregnant Heifers pen on positive PD check.'
        : 'Disabled: Heifers will remain in current pen upon positive PD check.'
    );
  };

  const handleRunHerdSync = () => {
    setIsSyncingHerd(true);
    try {
      const result = syncHerdPens(animals, reproEvents, settings, penMovements);
      setSyncReport(result);
      setShowSyncModal(true);

      if (result.movementsCount > 0 && onAnimalsUpdated) {
        onAnimalsUpdated(result.updatedAnimals, result.newMovements);
        onShowToast(`✅ Herd Pen Alignment Complete: ${result.movementsCount} animal(s) synchronized!`);
      } else {
        onShowToast(` Herd is already in perfect sync with all pen and lifecycle rules!`);
      }
    } catch (err: any) {
      alert('Error syncing herd: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSyncingHerd(false);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-slate-100">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Pen &amp; Housing Category Mapping
            </h4>
            <p className="text-xs text-slate-400 font-bold">
              Map universal farm lifecycle categories to your farm's custom pen names
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunHerdSync}
          disabled={isSyncingHerd}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-100 active:scale-95 cursor-pointer shrink-0"
          title="Audit and synchronize pens for all existing animals in database"
        >
          <ArrowRightLeft className={`w-4 h-4 ${isSyncingHerd ? 'animate-spin' : ''}`} />
          <span>{isSyncingHerd ? 'Syncing...' : 'Sync & Re-align Herd Pens'}</span>
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-2xl p-4 mb-6 text-xs text-indigo-900 leading-relaxed font-medium">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-indigo-950 mb-1">How Pen Mapping Works:</p>
            <p className="text-indigo-800 text-[11px]">
              Enter the exact pen names used on your farm in the right-hand column (e.g. <em>"Shed 1"</em>, <em>"Newborn Hutches"</em>, <em>"Barn A"</em>). When calving, dry-off, or pregnancy confirmation occurs, the system automatically moves animals into the corresponding pen while displaying your custom names across all views, filters, and reports.
            </p>
          </div>
        </div>
      </div>

      {/* Categories Matrix */}
      <div className="bg-slate-50/70 border border-slate-100 rounded-3xl p-3 sm:p-5 mb-6 shadow-inner space-y-3">
        <div className="hidden sm:grid grid-cols-12 gap-4 px-3 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60">
          <span className="col-span-5">System Category &amp; Function</span>
          <span className="col-span-6">Your Custom Farm Pen Name</span>
          <span className="col-span-1 text-center">Reset</span>
        </div>

        <div className="space-y-2.5">
          {PEN_CATEGORIES.map(cat => {
            const currentVal = currentMapping[cat.key] ?? cat.defaultName;
            const IconComp = cat.icon;
            const isCustom = currentVal.trim() !== cat.defaultName;

            return (
              <div
                key={cat.key}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-indigo-100"
              >
                {/* Left: Category info */}
                <div className="sm:col-span-5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-black ${cat.badgeColor}`}>
                      <IconComp className="w-3.5 h-3.5 shrink-0" />
                      {cat.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight">
                    {cat.description}
                  </p>
                  <p className="text-[10px] text-indigo-600/90 font-bold italic">
                    ⚡ {cat.triggerInfo}
                  </p>
                </div>

                {/* Right: Custom Pen Input */}
                <div className="sm:col-span-6">
                  <label className="block sm:hidden text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Your Farm Pen Name
                  </label>
                  <input
                    type="text"
                    value={currentVal}
                    placeholder={`e.g. ${cat.defaultName}`}
                    onChange={e => handlePenNameChange(cat.key, e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-black text-slate-800 shadow-inner outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                  />
                </div>

                {/* Reset button */}
                <div className="sm:col-span-1 flex justify-end sm:justify-center">
                  <button
                    type="button"
                    onClick={() => handleResetToDefault(cat.key, cat.defaultName)}
                    disabled={!isCustom}
                    title={`Reset to default "${cat.defaultName}"`}
                    className={`p-2 rounded-xl border transition-all ${
                      isCustom
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200 cursor-pointer'
                        : 'bg-slate-50 text-slate-300 border-transparent cursor-not-allowed opacity-50'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-Move Heifer Toggle */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Auto-Move Breedable Heifers to Pregnant Heifer Pen
            </h5>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            When a heifer in the <strong>Breedable Heifers</strong> pen is confirmed pregnant (+ve) at Pregnancy Diagnosis, automatically transfer her to the <strong>Pregnant Heifers</strong> pen and generate an alert.
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleAutoMoveHeifer}
          className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            settings.autoMoveHeiferOnPD !== false ? 'bg-indigo-600' : 'bg-slate-200'
          }`}
          role="switch"
          aria-checked={settings.autoMoveHeiferOnPD !== false}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              settings.autoMoveHeiferOnPD !== false ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Herd Sync Results Modal */}
      {showSyncModal && syncReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800">Herd Pen Alignment Results</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {syncReport.movementsCount} animal(s) synchronized
                  </p>
                </div>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-xs">
              {syncReport.summary.length > 0 ? (
                syncReport.summary.map((line, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700 flex items-start gap-2">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center text-emerald-800 font-bold">
                  All animals in your database already comply with current pen mappings and lifecycle states. No movements needed!
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowSyncModal(false)}
              className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-black transition-all cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
