import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarRange,
  CheckCircle2,
  Stethoscope,
  FlaskConical,
  FileText,
  Settings,
  SlidersHorizontal,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { FarmSettings, NavigationTabsConfig } from '../types';
import { DEFAULT_NAVIGATION_TABS } from '../services/storage';

interface CustomizeNavigationSectionProps {
  settings?: FarmSettings;
  updateSettings?: (settings: FarmSettings) => void;
  navigationTabs?: NavigationTabsConfig;
  onChange?: (newNav: NavigationTabsConfig) => void;
  onResetDefaults?: () => void;
  activeView?: string;
  onNavigateToView?: (view: any) => void;
  onShowToast?: (msg: string) => void;
}

interface NavTabItemMeta {
  key: keyof NavigationTabsConfig;
  label: string;
  badge: string;
  icon: React.ElementType;
  description: string;
  colorClass: string;
  bgLightClass: string;
}

export const NAV_TABS_META: NavTabItemMeta[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    badge: 'Overview & Telemetry',
    icon: LayoutDashboard,
    description: 'Real-time herd KPIs, reproductive rate summaries, alerts & daily veterinary action list',
    colorClass: 'text-blue-600',
    bgLightClass: 'bg-blue-50 border-blue-100 text-blue-700'
  },
  {
    key: 'animals',
    label: 'Herd Hub',
    badge: 'Cattle Directory',
    icon: Users,
    description: 'Complete livestock dossiers, active/dry/calf classifications, pen locations & historical timeline',
    colorClass: 'text-emerald-600',
    bgLightClass: 'bg-emerald-50 border-emerald-100 text-emerald-700'
  },
  {
    key: 'repro',
    label: 'Reproduction',
    badge: 'Breeding & Estrus',
    icon: CalendarRange,
    description: 'Estrus observations, AI inseminations, semen catalog, conception tracking & heat cycles',
    colorClass: 'text-purple-600',
    bgLightClass: 'bg-purple-50 border-purple-100 text-purple-700'
  },
  {
    key: 'pd-check',
    label: 'PD Check',
    badge: 'Pregnancy Diagnosis',
    icon: CheckCircle2,
    description: 'Veterinary palpation & ultrasound recording, batch PD checks, heifer pen movements & WhatsApp logs',
    colorClass: 'text-teal-600',
    bgLightClass: 'bg-teal-50 border-teal-100 text-teal-700'
  },
  {
    key: 'health',
    label: 'Health Bay',
    badge: 'Clinical Care & Pharmacy',
    icon: Stethoscope,
    description: 'Diagnoses, antibiotic regimens, mastitis/lameness treatments & pharmacy medicine inventory',
    colorClass: 'text-rose-600',
    bgLightClass: 'bg-rose-50 border-rose-100 text-rose-700'
  },
  {
    key: 'protocols',
    label: 'Protocol Lab',
    badge: 'Hormone Programs',
    icon: FlaskConical,
    description: 'Ovsynch, Double-Ovsynch & custom timed AI protocols with automated dose reminders',
    colorClass: 'text-amber-600',
    bgLightClass: 'bg-amber-50 border-amber-100 text-amber-700'
  },
  {
    key: 'reports',
    label: 'Report Center',
    badge: 'Analytics & PDF Dossiers',
    icon: FileText,
    description: 'High-resolution PDF generation, custom date filters, reproductive health audits & exports',
    colorClass: 'text-indigo-600',
    bgLightClass: 'bg-indigo-50 border-indigo-100 text-indigo-700'
  },
  {
    key: 'settings',
    label: 'Configurations',
    badge: 'System & Housing',
    icon: Settings,
    description: 'Farm parameters, bio-settings, pen assignment rules, staff directories & security credentials',
    colorClass: 'text-slate-700',
    bgLightClass: 'bg-slate-100 border-slate-200 text-slate-800'
  }
];

export const CustomizeNavigationSection: React.FC<CustomizeNavigationSectionProps> = ({
  settings,
  updateSettings,
  navigationTabs,
  onChange,
  onResetDefaults,
  activeView,
  onNavigateToView,
  onShowToast
}) => {
  const currentTabs: NavigationTabsConfig = {
    ...DEFAULT_NAVIGATION_TABS,
    ...(settings?.navigationTabs || navigationTabs || {})
  };

  const handleToggleTab = (tabKey: keyof NavigationTabsConfig) => {
    const isCurrentlyOn = currentTabs[tabKey] !== false;
    const nextValue = !isCurrentlyOn;

    // Safety guard: prevent turning off all tabs
    const activeCount = Object.values({ ...currentTabs, [tabKey]: nextValue }).filter(Boolean).length;
    if (activeCount === 0) {
      onShowToast?.('At least one navigation tab must remain active.');
      return;
    }

    const updatedTabs: NavigationTabsConfig = {
      ...currentTabs,
      [tabKey]: nextValue
    };

    // Fast local persistence backup
    try {
      localStorage.setItem('agrovet_navigation_tabs', JSON.stringify(updatedTabs));
    } catch (e) {}

    if (onChange) {
      onChange(updatedTabs);
    } else if (updateSettings && settings) {
      updateSettings({
        ...settings,
        navigationTabs: updatedTabs
      });
    }

    const meta = NAV_TABS_META.find(t => t.key === tabKey);
    const tabName = meta ? meta.label : tabKey;
    onShowToast?.(
      nextValue
        ? `${tabName} tab is now visible in the navigation menu.`
        : `${tabName} tab is hidden from navigation. All records are safely preserved.`
    );

    // If user hides the current view, switch to an available enabled tab
    if (!nextValue && activeView === tabKey) {
      const remainingActiveKey = (Object.keys(updatedTabs) as (keyof NavigationTabsConfig)[]).find(
        k => updatedTabs[k]
      );
      if (remainingActiveKey && onNavigateToView) {
        onNavigateToView(remainingActiveKey);
      }
    }
  };

  const handleEnableAll = () => {
    const allEnabled: NavigationTabsConfig = {
      dashboard: true,
      animals: true,
      repro: true,
      'pd-check': true,
      health: true,
      protocols: true,
      reports: true,
      settings: true
    };
    try {
      localStorage.setItem('agrovet_navigation_tabs', JSON.stringify(allEnabled));
    } catch (e) {}
    if (onChange) {
      onChange(allEnabled);
    } else if (updateSettings && settings) {
      updateSettings({
        ...settings,
        navigationTabs: allEnabled
      });
    }
    onShowToast?.('All 8 navigation tabs are now enabled and visible.');
  };

  const handleResetToDefaults = () => {
    try {
      localStorage.setItem('agrovet_navigation_tabs', JSON.stringify(DEFAULT_NAVIGATION_TABS));
    } catch (e) {}
    if (onResetDefaults) {
      onResetDefaults();
    } else if (onChange) {
      onChange({ ...DEFAULT_NAVIGATION_TABS });
    } else if (updateSettings && settings) {
      updateSettings({
        ...settings,
        navigationTabs: { ...DEFAULT_NAVIGATION_TABS }
      });
    }
    onShowToast?.('Navigation configuration reset to standard defaults.');
  };

  const visibleCount = Object.values(currentTabs).filter(Boolean).length;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 mt-0.5">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Customize Navigation
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                {visibleCount} of 8 Visible
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Turn individual tabs ON or OFF using toggle switches. Turning a tab OFF hides it from the sidebar while keeping 100% of your records and data safe.
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleEnableAll}
            className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
            title="Enable all 8 navigation tabs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Enable All</span>
          </button>
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
            title="Reset to default settings"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Tabs List */}
      <div className="p-4 sm:p-6 divide-y divide-slate-100">
        {NAV_TABS_META.map((tab) => {
          const isEnabled = currentTabs[tab.key] !== false;
          const TabIcon = tab.icon;

          return (
            <div
              key={tab.key}
              className={`py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 transition-colors ${
                isEnabled ? 'hover:bg-slate-50/50' : 'opacity-70 bg-slate-50/30'
              } px-3 rounded-xl`}
            >
              {/* Left: Icon, Tab Name & Info */}
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                    isEnabled
                      ? `${tab.bgLightClass} shadow-sm`
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                >
                  <TabIcon className={`w-5 h-5 ${isEnabled ? tab.colorClass : 'text-slate-400'}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm tracking-tight">
                      {tab.label}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        isEnabled
                          ? 'bg-slate-100 text-slate-600 border-slate-200/80'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {tab.badge}
                    </span>
                    {isEnabled ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Eye className="w-3 h-3 text-emerald-600" />
                        ON
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        <EyeOff className="w-3 h-3 text-slate-400" />
                        OFF
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
                    {tab.description}
                  </p>
                </div>
              </div>

              {/* Right: Modern iOS/Tailwind Toggle Switch */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold hidden sm:inline-block w-8 text-right text-slate-600">
                  {isEnabled ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  aria-label={`Toggle visibility of ${tab.label} tab`}
                  onClick={() => handleToggleTab(tab.key)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isEnabled ? 'bg-blue-600' : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                >
                  <span className="sr-only">Toggle {tab.label}</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety Notice Footer */}
      <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-500">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-700">Zero Data Loss Guarantee:</strong> Hiding a tab only conceals its link from the menu. All cow profiles, inseminations, treatments, doses, and logs remain 100% saved in the database. You can turn any tab back ON anytime to resume full access.
        </p>
      </div>
    </div>
  );
};
