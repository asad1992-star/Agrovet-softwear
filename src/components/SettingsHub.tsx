import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Compass,
  Activity,
  Users,
  Dna,
  Home,
  Shield,
  Database,
  Save,
  Plus,
  X,
  KeyRound,
  Mail,
  UserCheck,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Clock,
  Palette,
  LogOut
} from 'lucide-react';
import {
  FarmSettings,
  Animal,
  ReproductionEvent,
  HealthEvent,
  ProtocolEnrollment,
  ProtocolTemplate,
  Medicine,
  MedicinePurchase,
  PenMovement,
  ViewState
} from '../types';
import { AuthUser } from '../services/authService';
import { CustomizeNavigationSection } from './CustomizeNavigationSection';
import { PenSettingsSection } from './PenSettingsSection';
import { BackupSettingsSection } from './BackupSettingsSection';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { AGROVET_LOGO_BASE64 } from '../utils/logoBase64';

export interface SettingsHubProps {
  settings: FarmSettings;
  updateSettings: (newSettings: FarmSettings) => void;
  animals: Animal[];
  reproEvents: ReproductionEvent[];
  healthEvents: HealthEvent[];
  enrollments: ProtocolEnrollment[];
  customProtocols: ProtocolTemplate[];
  medicines: Medicine[];
  purchases: MedicinePurchase[];
  penMovements: PenMovement[];
  currentUser: AuthUser | null;
  onAnimalsUpdated: (animals: Animal[], movements: PenMovement[]) => void;
  onShowToast: (msg: string) => void;
  setConfirmDialog: (dialog: any) => void;
  onNavigateToView?: (view: ViewState) => void;
  onSignOut?: () => void;
  onOpenWhatsNew?: () => void;
}

type SettingsTab = 'all' | 'navigation' | 'bioparams' | 'farm' | 'team' | 'pens' | 'security' | 'backup';

export const SettingsHub: React.FC<SettingsHubProps> = ({
  settings,
  updateSettings,
  animals,
  reproEvents,
  healthEvents,
  enrollments,
  customProtocols,
  medicines,
  purchases,
  penMovements,
  currentUser,
  onAnimalsUpdated,
  onShowToast,
  setConfirmDialog,
  onNavigateToView,
  onSignOut,
  onOpenWhatsNew
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('all');
  const [newGroupName, setNewGroupName] = useState('');
  const [newTechnicianName, setNewTechnicianName] = useState('');
  const [newSemenName, setNewSemenName] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Tab definitions
  const tabs: { id: SettingsTab; label: string; icon: any; badge?: string }[] = [
    { id: 'all', label: 'All Settings', icon: Sliders },
    { id: 'navigation', label: 'Navigation Tabs', icon: Compass, badge: 'New' },
    { id: 'bioparams', label: 'Bio-Parameters', icon: Activity },
    { id: 'farm', label: 'Farm & Palette', icon: Palette },
    { id: 'team', label: 'Personnel & Semen', icon: Users },
    { id: 'pens', label: 'Pen Housing', icon: Home },
    { id: 'security', label: 'Account & Security', icon: Shield, badge: 'OTP' },
    { id: 'backup', label: 'Data & Backup', icon: Database }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3.5 bg-blue-600/90 text-white rounded-2xl shadow-lg shadow-blue-500/30 border border-blue-400/20">
              <SettingsIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">System Configurations</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                  Live Sync
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 max-w-xl">
                Customize visible navigation tabs, biological gestation thresholds, herd groups, semen catalog, and account recovery credentials.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <KeyRound className="w-4 h-4 text-blue-300" />
              <span>Forgot Password?</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onShowToast('Farm configurations verified & saved.');
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save &amp; Sync</span>
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-md scale-100'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider ${
                      isSelected
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. CUSTOMIZE NAVIGATION SECTION */}
      {(activeTab === 'all' || activeTab === 'navigation') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm transition-all">
          <CustomizeNavigationSection
            settings={settings}
            updateSettings={updateSettings}
            navigationTabs={settings?.navigationTabs}
            onChange={(newNav) => updateSettings({ ...settings, navigationTabs: newNav })}
            onShowToast={onShowToast}
            onResetDefaults={() => {
              updateSettings({
                ...settings,
                navigationTabs: {
                  dashboard: true,
                  animals: true,
                  repro: true,
                  'pd-check': true,
                  health: true,
                  protocols: true,
                  reports: true,
                  settings: true
                }
              });
              onShowToast('Navigation tabs reset to default configuration.');
            }}
          />
        </div>
      )}

      {/* 2. ACCOUNT & SECURITY (FORGOT PASSWORD / RECOVERY) */}
      {(activeTab === 'all' || activeTab === 'security') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Account &amp; Security</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Manage login credentials, password reset via OTP verification, and farm data access.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Protected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Profile Card */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">{currentUser?.name || 'Farm Administrator'}</h4>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {currentUser?.email || 'Registered User'}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Session Status</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Active &bull; Authenticated
                </span>
              </div>
              <div className="pt-3 flex flex-wrap gap-2">
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex-1 py-2.5 px-3 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                )}
                {onOpenWhatsNew && (
                  <button
                    type="button"
                    onClick={onOpenWhatsNew}
                    className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>What's New</span>
                  </button>
                )}
              </div>
            </div>

            {/* Forgot / Reset Password Action Card */}
            <div className="p-5 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 rounded-2xl border border-blue-100 space-y-3">
              <div>
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>Forgot or Change Password</span>
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Reset your password securely. A 4-digit OTP will be verified before choosing your new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Launch Forgot Password (OTP)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. BIO-PARAMETERS */}
      {(activeTab === 'all' || activeTab === 'bioparams') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Biological Parameters</h3>
              <p className="text-xs text-slate-500 font-medium">
                Standard physiological day counters for reproduction milestones and workflow alerts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                Average Gestation
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="200"
                  max="320"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  value={settings.gestationDays}
                  onChange={(e) => updateSettings({ ...settings, gestationDays: parseInt(e.target.value) || 283 })}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  Days
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Standard bovine gestation period (default: 283d).</p>
            </div>

            <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                Preg Check Window
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="20"
                  max="90"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  value={settings.pregnancyCheckDays}
                  onChange={(e) => updateSettings({ ...settings, pregnancyCheckDays: parseInt(e.target.value) || 30 })}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  Days
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Days post-AI for pregnancy diagnosis (default: 30d).</p>
            </div>

            <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                Dry Period Duration
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="30"
                  max="90"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  value={settings.dryPeriodDays}
                  onChange={(e) => updateSettings({ ...settings, dryPeriodDays: parseInt(e.target.value) || 60 })}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  Days
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Days prior to expected calving to dry-off cow (default: 60d).</p>
            </div>

            <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
              <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                Closeup Phase
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="45"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  value={settings.closeupDays}
                  onChange={(e) => updateSettings({ ...settings, closeupDays: parseInt(e.target.value) || 21 })}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  Days
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Transition ration window before calving (default: 21d).</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. FARM IDENTITY & STATUS PALETTE */}
      {(activeTab === 'all' || activeTab === 'farm') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Farm Identity &amp; Status Colors</h3>
              <p className="text-xs text-slate-500 font-medium">
                Customize farm naming and visual tags for herd reproduction statuses across all screens.
              </p>
            </div>
          </div>

          <div className="space-y-2 max-w-lg">
            <label className="block text-[11px] font-black text-slate-600 uppercase tracking-wider">
              Farm / Dairy Enterprise Name
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 shadow-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={settings.farmName}
              onChange={(e) => updateSettings({ ...settings, farmName: e.target.value })}
              placeholder="e.g. Asad Dairy Farm"
            />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">
              Status Color Indicators
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {([
                { key: 'active', label: 'Active' },
                { key: 'pregnant', label: 'Pregnant' },
                { key: 'sick', label: 'Sick' },
                { key: 'dry', label: 'Dry' },
                { key: 'closeup', label: 'Closeup' },
                { key: 'inProtocol', label: 'In Protocol' },
                { key: 'inseminated', label: 'Inseminated' },
                { key: 'observation', label: 'Observation' }
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
                  <span className="text-xs font-black text-slate-700">{label}</span>
                  <div className="w-9 h-9 rounded-xl border-2 border-white shadow-md overflow-hidden shrink-0">
                    <input
                      type="color"
                      className="w-12 h-12 -m-1.5 cursor-pointer border-none"
                      value={settings.statusColors?.[key] || '#3B82F6'}
                      onChange={(e) =>
                        updateSettings({
                          ...settings,
                          statusColors: {
                            ...settings.statusColors,
                            [key]: e.target.value
                          }
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. PERSONNEL, SEMEN CATALOGUE & HERD GROUPS */}
      {(activeTab === 'all' || activeTab === 'team') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Personnel, Genetics &amp; Groups</h3>
              <p className="text-xs text-slate-500 font-medium">
                Configure dropdown shortcuts for veterinarians, technicians, semen inventory codes, and herd groupings.
              </p>
            </div>
          </div>

          {/* Farm Technicians & Doctors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Farm Technicians &amp; Veterinarians
              </h4>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                Quick-Select Dropdowns
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Configured names appear in AI, PD check, and treatment entries. Variations in spelling are normalized to these names.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New technician or doctor (e.g. Asad, Faisal Sb, Dr. Waqas)"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={newTechnicianName}
                onChange={(e) => setNewTechnicianName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTechnicianName.trim()) {
                    e.preventDefault();
                    const current = settings.technicians || ['Asad', 'Faisal Sb'];
                    const trimmed = newTechnicianName.trim();
                    if (!current.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
                      updateSettings({ ...settings, technicians: [...current, trimmed] });
                    }
                    setNewTechnicianName('');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newTechnicianName.trim()) {
                    const current = settings.technicians || ['Asad', 'Faisal Sb'];
                    const trimmed = newTechnicianName.trim();
                    if (!current.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
                      updateSettings({ ...settings, technicians: [...current, trimmed] });
                    }
                    setNewTechnicianName('');
                  }
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {(settings.technicians || ['Asad', 'Faisal Sb']).map((tech, idx) => (
                <div key={tech} className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400">#{idx + 1}</span>
                  <span className="text-xs font-black text-slate-700">{tech}</span>
                  <button
                    type="button"
                    title="Remove from active dropdown (historical logs preserved)"
                    onClick={() => {
                      const current = settings.technicians || ['Asad', 'Faisal Sb'];
                      updateSettings({ ...settings, technicians: current.filter((t) => t !== tech) });
                    }}
                    className="text-slate-400 hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Semen Stock / Catalogue */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Semen Stock / Catalogue
              </h4>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                Breeding Straws
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Active bull names or semen codes for fast selection during insemination entries.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New semen code or bull name (e.g. Captain, AltaRobson, CRV-542)"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={newSemenName}
                onChange={(e) => setNewSemenName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSemenName.trim()) {
                    e.preventDefault();
                    const current = settings.semenCatalog || [];
                    const trimmed = newSemenName.trim();
                    if (!current.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
                      updateSettings({ ...settings, semenCatalog: [...current, trimmed] });
                    }
                    setNewSemenName('');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newSemenName.trim()) {
                    const current = settings.semenCatalog || [];
                    const trimmed = newSemenName.trim();
                    if (!current.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
                      updateSettings({ ...settings, semenCatalog: [...current, trimmed] });
                    }
                    setNewSemenName('');
                  }
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {(settings.semenCatalog || []).map((semen, idx) => (
                <div key={semen} className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400">#{idx + 1}</span>
                  <span className="text-xs font-black text-slate-700">{semen}</span>
                  <button
                    type="button"
                    title="Remove from active dropdown"
                    onClick={() => {
                      const current = settings.semenCatalog || [];
                      updateSettings({ ...settings, semenCatalog: current.filter((s) => s !== semen) });
                    }}
                    className="text-slate-400 hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {(!settings.semenCatalog || settings.semenCatalog.length === 0) && (
                <p className="text-xs text-slate-400 italic">No semen catalogue items registered yet.</p>
              )}
            </div>
          </div>

          {/* Herd Groups Management */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Custom Herd Groups
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New group name (e.g. Elite A, First Lactation)"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newGroupName.trim()) {
                    e.preventDefault();
                    const groups = settings.customGroups || [];
                    if (!groups.includes(newGroupName.trim())) {
                      updateSettings({ ...settings, customGroups: [...groups, newGroupName.trim()] });
                    }
                    setNewGroupName('');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newGroupName.trim()) {
                    const groups = settings.customGroups || [];
                    if (!groups.includes(newGroupName.trim())) {
                      updateSettings({ ...settings, customGroups: [...groups, newGroupName.trim()] });
                    }
                    setNewGroupName('');
                  }
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {(settings.customGroups || []).map((group, idx) => (
                <div key={group} className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400">#{idx + 1}</span>
                  <span className="text-xs font-black text-slate-700">{group}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({
                        ...settings,
                        customGroups: (settings.customGroups || []).filter((g) => g !== group)
                      })
                    }
                    className="text-slate-400 hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {(!settings.customGroups || settings.customGroups.length === 0) && (
                <p className="text-xs text-slate-400 italic">No custom herd groups defined yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. PEN / HOUSING ALLOCATION */}
      {(activeTab === 'all' || activeTab === 'pens') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
          <PenSettingsSection
            settings={settings}
            updateSettings={updateSettings}
            animals={animals}
            reproEvents={reproEvents}
            penMovements={penMovements}
            onAnimalsUpdated={(updatedAnimals, newMovements) => {
              onAnimalsUpdated(updatedAnimals, newMovements);
            }}
            onShowToast={onShowToast}
          />
        </div>
      )}

      {/* 7. DATA PROTECTION & AUTO-BACKUP */}
      {(activeTab === 'all' || activeTab === 'backup') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
          <BackupSettingsSection
            settings={settings}
            updateSettings={updateSettings}
            animals={animals}
            reproEvents={reproEvents}
            healthEvents={healthEvents}
            enrollments={enrollments}
            customProtocols={customProtocols}
            medicines={medicines}
            purchases={purchases}
            onShowToast={onShowToast}
            setConfirmDialog={setConfirmDialog}
          />
        </div>
      )}

      {/* Developer Profile & Support Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 rounded-3xl text-white shadow-xl border border-slate-700/50 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <img
            src={AGROVET_LOGO_BASE64}
            alt="AgroVet Pro"
            className="w-20 h-20 rounded-3xl object-cover shadow-2xl border border-white/20 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h4 className="text-xl font-black tracking-tight">
                AgroVet<span className="text-emerald-400">Pro</span>
              </h4>
              <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 uppercase">
                V2.5 Stable
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Dairy &amp; Cattle Farm Reproduction, Diagnostics &amp; Clinical Health System
            </p>
            <p className="text-xs text-emerald-400 font-bold">Developed by Asad Mehmood</p>
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <a
                href="https://wa.me/923136451992?text=Hello%20Asad%20Mehmood,%20I%20need%20assistance%20with%20my%20AgroVet%20Pro%20system."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition-colors"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>WhatsApp Support: +92 313 6451992</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password OTP Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        userEmail={currentUser?.email || ''}
        onSuccessToast={onShowToast}
      />
    </div>
  );
};
