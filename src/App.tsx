import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarRange,
  Bell,
  Search,
  Plus,
  ChevronRight,
  X,
  AlertCircle,
  Download,
  Settings as SettingsIcon,
  Clock,
  Save,
  MessageCircle,
  Menu,
  Baby,
  Tag,
  ClipboardList,
  CheckCircle2,
  Calendar as CalendarIcon,
  FlaskConical,
  Play,
  Layers,
  Activity,
  ArrowRight,
  Printer,
  Trash2,
  Syringe,
  Thermometer,
  History,
  TrendingUp,
  MapPin,
  LayoutList,
  LayoutGrid,
  Grid2X2,
  Square,
  RotateCcw,
  Edit2,
  Filter,
  Check,
  MoreVertical,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  ShieldCheck,
  Target,
  Palette,
  HeartPulse,
  AlertTriangle,
  BabyIcon,
  ChevronDown,
  Droplets,
  Share2,
  Upload,
  Zap,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  Pill,
  Package
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

import { useFarm } from './hooks/useFarm';
import {
  AnimalStatus,
  ReproEventType,
  HealthEventType,
  Animal,
  ReproductionEvent,
  HealthEvent,
  ProtocolEnrollment,
  ProtocolTemplate,
  ProtocolStep,
  Medicine
} from './types';
import { validations, dateUtils } from './services/businessLogic';
import {
  generateReproSectionReport,
  generateHealthSectionReport,
  generateDashboardPDF,
  generateProtocolReport,
  generateIndividualAnimalReport,
  generateAnimalListReport,
  generateProtocolListReport,
  generatePdCheckSectionReport,
  generateTreatmentAnalysisReport,
  generateMedicineInventoryReport,
  generateLowStockReport,
  generateDemandForecastReport
} from './utils/pdfUtils';
import {
  shareToWhatsApp,
  generateAnimalShareText,
  generateReproEventShareText,
  generateHealthEventShareText,
  generateListShareText
} from './utils/shareUtils';
import { auth } from './services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';

const StatCard = ({ title, value, icon: Icon, colorClass, trend, onClick }: any) => (
  <div
    className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-blue-200 active:scale-95' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-4 rounded-3xl ${colorClass} bg-opacity-10 shadow-inner`}>
        <Icon className={`w-7 h-7 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      {trend && (
        <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100 uppercase tracking-tighter">
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-4xl font-black text-slate-800">{value}</h3>
      {onClick && <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">Tap to view →</p>}
    </div>
  </div>
);

const FormModal = ({ title, isOpen, onClose, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-xl font-black text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-2xl transition-all">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>
        <div className="p-8 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const getStatusColor = (status?: AnimalStatus) => {
  switch (status) {
    case AnimalStatus.PREGNANT: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case AnimalStatus.SICK: return 'bg-rose-50 text-rose-700 border-rose-200';
    case AnimalStatus.IN_PROTOCOL: return 'bg-amber-50 text-amber-700 border-amber-200';
    case AnimalStatus.INSEMINATED: return 'bg-blue-50 text-blue-700 border-blue-200';
    case AnimalStatus.DRY: return 'bg-slate-100 text-slate-700 border-slate-300';
    case AnimalStatus.CLOSEUP: return 'bg-purple-50 text-purple-700 border-purple-200';
    case AnimalStatus.OBSERVATION: return 'bg-slate-50 text-slate-500 border-slate-200 dashed';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

type ViewState = 'dashboard' | 'animals' | 'repro' | 'health' | 'protocols' | 'reports' | 'settings' | 'pd-check';
type HerdViewMode = 'list' | 'small' | 'medium' | 'large';
type ReportType = 'summary' | 'repro' | 'health' | 'individual' | 'pd-check' | 'treatment-analysis' | 'medicine-inventory' | 'low-stock' | 'demand-forecast';
type HerdTab = 'adults' | 'calves';

const formatDateReadable = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const STICKY_COLORS = [
  { bg: 'bg-amber-50 border-amber-200 text-amber-800 shadow-amber-100/50', accent: 'bg-amber-400', icon: '🤰' },
  { bg: 'bg-rose-50 border-rose-200 text-rose-800 shadow-rose-100/50', accent: 'bg-rose-400', icon: '🩺' },
  { bg: 'bg-teal-50 border-teal-200 text-teal-800 shadow-teal-100/50', accent: 'bg-teal-400', icon: '🐄' },
  { bg: 'bg-sky-50 border-sky-200 text-sky-800 shadow-sky-100/50', accent: 'bg-sky-400', icon: '📊' },
  { bg: 'bg-purple-50 border-purple-200 text-purple-800 shadow-purple-100/50', accent: 'bg-purple-400', icon: '🏷️' },
];

const getBadgeStyleForDate = (dateStr: string) => {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % STICKY_COLORS.length;
  const num = Math.abs(hash) % 10000;
  return {
    badgeNum: `#${String(num).padStart(4, '0')}`,
    ...STICKY_COLORS[index]
  };
};

function MainApp({ user, onLogout, previewMode = 'desktop' }: any) {
  const {
    loading,
    animals,
    reproEvents,
    healthEvents,
    medicines,
    enrollments,
    protocols,
    customProtocols,
    alerts,
    stats,
    settings,
    addAnimal,
    updateAnimal,
    deleteAnimal,
    addReproEvent,
    updateReproEvent,
    deleteReproEvent,
    addHealthEvent,
    updateHealthEvent,
    deleteHealthEvent,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    saveMedicinesDirectly,
    addEnrollment,
    updateEnrollment,
    deleteEnrollment,
    addCustomProtocol,
    deleteProtocolTemplate,
    updateSettings
  } = useFarm();

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth >= 769 && windowWidth <= 1024;
  const isDesktop = windowWidth >= 1025;
  const isSimulated = false;

  const [view, setView] = useState<ViewState>('dashboard');
  const [herdViewMode, setHerdViewMode] = useState<HerdViewMode>('medium');
  const [herdTab, setHerdTab] = useState<HerdTab>('adults');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const alertPanelRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [isAnimalFormOpen, setIsAnimalFormOpen] = useState(false);
  const [isReproFormOpen, setIsReproFormOpen] = useState(false);
  const [isHealthFormOpen, setIsHealthFormOpen] = useState(false);
  const [isEnrollmentFormOpen, setIsEnrollmentFormOpen] = useState(false);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [selectedEnrollmentDetail, setSelectedEnrollmentDetail] = useState<ProtocolEnrollment | null>(null);
  const [isPregnancyCheckOpen, setIsPregnancyCheckOpen] = useState(false);
  const [pregnancyCheckAnimal, setPregnancyCheckAnimal] = useState<Animal | null>(null);
  const [calfFormAnimal, setCalfFormAnimal] = useState<Animal | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [protocolAnimalSearch, setProtocolAnimalSearch] = useState('');
  const [healthPatientSearch, setHealthPatientSearch] = useState('');

  // Repro Filters & Sorts
  const [reproTagSearch, setReproTagSearch] = useState('');
  const [reproTechFilter, setReproTechFilter] = useState<string>('All');
  const [reproSemenFilter, setReproSemenFilter] = useState<string>('All');
  const [reproDateStart, setReproDateStart] = useState<string>('');
  const [reproDateEnd, setReproDateEnd] = useState<string>('');
  const [reproSort, setReproSort] = useState<'Date Desc' | 'Date Asc'>('Date Desc');

  // Health Filters
  const [healthTechFilter, setHealthTechFilter] = useState<string>('All');
  const [healthTypeFilter, setHealthTypeFilter] = useState<string>('All');
  const [healthMedFilter, setHealthMedFilter] = useState<string>('All');
  const [healthDateStart, setHealthDateStart] = useState<string>('');
  const [healthDateEnd, setHealthDateEnd] = useState<string>('');
  const [healthTagSearch, setHealthTagSearch] = useState<string>('');

  // Pregnancy Check Modal
  const [isPregnancyCheckModalOpen, setIsPregnancyCheckModalOpen] = useState(false);
  const [pregnancyCheckTarget, setPregnancyCheckTarget] = useState<Animal | null>(null);
  const [pregnancyCheckResult, setPregnancyCheckResult] = useState<'Pregnant' | 'Non-Pregnant' | ''>('');

  // Report Center State
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('summary');
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');
  const [reportAnimalId, setReportAnimalId] = useState<string>('');
  const [reportAnimalSearch, setReportAnimalSearch] = useState<string>('');

  // Report Date Filters (Individual Profile)
  const [animalReportStart, setAnimalReportStart] = useState<string>('');
  const [animalReportEnd, setAnimalReportEnd] = useState<string>('');

  // Editing State
  const [editingAnimalId, setEditingAnimalId] = useState<string | null>(null);
  const [editingReproId, setEditingReproId] = useState<string | null>(null);
  const [editingHealthId, setEditingHealthId] = useState<string | null>(null);

  // Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => { } });

  // PD Check (Pregnancy Diagnosis) Custom Features States
  const [isNewPdFormOpen, setIsNewPdFormOpen] = useState(false);
  const [isOldPdFormOpen, setIsOldPdFormOpen] = useState(false);
  const [isMultiPdFormOpen, setIsMultiPdFormOpen] = useState(false);

  const [pdAnimalId, setPdAnimalId] = useState('');
  const [pdResult, setPdResult] = useState<'Pregnant' | 'Open' | ''>('');
  const [pdNotes, setPdNotes] = useState('');

  const [oldPdDate, setOldPdDate] = useState('');
  const [oldPdAnimalId, setOldPdAnimalId] = useState('');
  const [oldPdResult, setOldPdResult] = useState<'Pregnant' | 'Open' | ''>('');
  const [oldPdNotes, setOldPdNotes] = useState('');

  const [multiPdText, setMultiPdText] = useState('');
  const [multiPdDate, setMultiPdDate] = useState('');

  const [pdSearchTerm, setPdSearchTerm] = useState('');
  const [pdStartDate, setPdStartDate] = useState('');
  const [pdEndDate, setPdEndDate] = useState('');
  const [selectedBadgeDate, setSelectedBadgeDate] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dashboardChartType, setDashboardChartType] = useState<'repro' | 'health' | 'conception'>('repro');

  // Medicine Inventory & Usage states
  const [healthSubTab, setHealthSubTab] = useState<'treatments' | 'inventory' | 'reports'>('treatments');
  const [isMedicineFormOpen, setIsMedicineFormOpen] = useState(false);
  const [newMedicine, setNewMedicine] = useState<Partial<Medicine>>({ name: '', category: 'Injection', unit: 'ml', packs: 0, loose: 0, loosePerPack: 100, minStockLevel: 50 });
  const [editingMedicineId, setEditingMedicineId] = useState<string | null>(null);
  const [medicineSearchQuery, setMedicineSearchQuery] = useState('');
  const [treatmentAnimalType, setTreatmentAnimalType] = useState<'single' | 'multiple'>('single');
  const [selectedMultipleAnimals, setSelectedMultipleAnimals] = useState<string[]>([]);
  const [activeMedicineDropdownIdx, setActiveMedicineDropdownIdx] = useState<number | null>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<{ id: string; msg: string }[]>([]);
  
  // Inventory Filtering & Period Reports
  const [medInventorySearch, setMedInventorySearch] = useState('');
  const [medInventoryCat, setMedInventoryCat] = useState('All');
  const [reportsPeriod, setReportsPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Pre-fill date picker states with today's date on mount
  useEffect(() => {
    setOldPdDate(dateUtils.today());
    setMultiPdDate(dateUtils.today());
  }, []);

  // Protocol cow-tag search (within protocol tab)
  const [protocolTagSearch, setProtocolTagSearch] = useState('');
  // Protocol view mode: 'active' | 'history'
  const [protocolView, setProtocolView] = useState<'active' | 'history'>('active');

  const [dashboardFilter, setDashboardFilter] = useState<{
    dateRange: string;
    breed: string;
    category: string;
  }>({
    dateRange: 'All',
    breed: 'All',
    category: 'All'
  });

  const handleMetricClick = (metric: string) => {
    setSearchTerm('');
    setStatusFilter('All');
    
    if (metric === 'Pregnant') {
      setView('animals');
      setStatusFilter('Pregnant');
    } else if (metric === 'Sick') {
      setView('animals');
      setStatusFilter('Sick');
    } else if (metric === 'Open') {
      setView('animals');
      setStatusFilter('Active');
    } else if (metric === 'In Lab' || metric === 'Protocol') {
      setProtocolView('active');
      setView('protocols');
    } else if (metric === 'Heat Due') {
      setView('repro');
      setReproTagSearch('');
    } else if (metric === 'Calving Due') {
      setView('animals');
      setStatusFilter('Closeup');
    } else if (metric === 'Repeat Breeders') {
      setView('animals');
      setStatusFilter('All');
      setSearchTerm('Repeat');
    } else if (metric === 'Heat') {
      setView('animals');
      setStatusFilter('All');
      setSearchTerm('Heat');
    } else if (metric === 'Treated') {
      setView('animals');
      // I don't have a "Treated" status, but I can filter by "Recently Treated" in searchTerm if I add it
      setSearchTerm('Recently treated');
    } else if (metric === 'Dry') {
      setView('animals');
      setStatusFilter('Dry');
    } else if (metric === 'Observation') {
      setView('animals');
      setStatusFilter('Observation');
    } else if (metric === 'Overdue') {
      setView('animals');
      setStatusFilter('Closeup');
      setSearchTerm('Overdue');
    } else {
      setView('animals');
    }
  };
  // History date filter
  const [historyMonth, setHistoryMonth] = useState('');
  // Selected protocol for drill-down view (protocol list -> protocol detail)
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null);
  const [selectedHistoryProtocolId, setSelectedHistoryProtocolId] = useState<string | null>(null);
  // Group management in settings
  const [newGroupName, setNewGroupName] = useState('');
  // Dashboard status filter navigation
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState<string | null>(null);

  // Repro form cow search autocomplete
  const [reproAnimalSearch, setReproAnimalSearch] = useState('');
  const [reproAnimalDropdown, setReproAnimalDropdown] = useState(false);

  // Health form cow search autocomplete
  const [healthAnimalSearch, setHealthAnimalSearch] = useState('');
  const [healthAnimalDropdown, setHealthAnimalDropdown] = useState(false);

  // Form states
  const [newAnimal, setNewAnimal] = useState<Partial<Animal>>({ sex: 'Female', breed: 'Holstein', herd: 'Main Herd' });
  const [newRepro, setNewRepro] = useState<Partial<ReproductionEvent>>({ type: ReproEventType.ESTRUS, date: new Date().toISOString().split('T')[0] });
  const [newHealth, setNewHealth] = useState<Partial<HealthEvent>>({ type: HealthEventType.ILLNESS, date: new Date().toISOString().split('T')[0] });
  const [newEnrollment, setNewEnrollment] = useState<Partial<ProtocolEnrollment> & { animalIds?: string[] }>({ startDate: new Date().toISOString().split('T')[0], animalIds: [] });
  const [newTemplate, setNewTemplate] = useState<Partial<ProtocolTemplate>>({ name: '', description: '', steps: [{ dayOffset: 0, action: '', isAI: false, time: '08:00' }], isPredefined: false });

  // Protocol Grouping & AI Workflow State
  const [protocolDateStart, setProtocolDateStart] = useState<string>('');
  const [protocolDateEnd, setProtocolDateEnd] = useState<string>('');
  const [aiWorkflow, setAiWorkflow] = useState<{ groupId: string; currentAnimalIndex: number } | null>(null);

  // Handle outside click for search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close forms when animal selection changes
  useEffect(() => {
    if (selectedAnimal) {
      setIsReproFormOpen(false);
      setIsHealthFormOpen(false);
      setIsEnrollmentFormOpen(false);
    }
  }, [selectedAnimal]);

  const filteredAnimals = useMemo(() => {
    return animals.filter(a => {
      const term = searchTerm.toLowerCase();
      
      // Handle special metric searches from dashboard
      const isRepeatBreeder = term === 'repeat' || term === 'repeat breeders';
      const isInHeat = term === 'heat' || term === 'in heat';
      const isRecentlyTreated = term === 'recently treated';
      const isOverdue = term === 'overdue';

      if (isRepeatBreeder) {
        const insemCount = reproEvents.filter(e => e.animalId === a.id && e.type === ReproEventType.INSEMINATION).length;
        return insemCount >= 3 && a.status !== AnimalStatus.PREGNANT;
      }

      if (isInHeat) {
        const today = new Date().toISOString().split('T')[0];
        const animalEvents = reproEvents.filter(e => e.animalId === a.id);
        const latestHeat = animalEvents
          .filter(e => e.type === ReproEventType.ESTRUS)
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        return latestHeat && latestHeat.date === today;
      }

      if (isRecentlyTreated) {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        return healthEvents.some(e => e.animalId === a.id && e.date >= sevenDaysAgoStr);
      }

      if (isOverdue) {
        return alerts.some(al => al.animalId === a.id && al.title.includes('OVERDUE'));
      }

      const matchesSearch =
        a.tag.toLowerCase().includes(term) ||
        (a.name?.toLowerCase().includes(term)) ||
        (a.herd.toLowerCase().includes(term)) ||
        (a.status?.toLowerCase().includes(term));
      const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
      
      // Breed filter from dashboard
      const matchesDashboardBreed = dashboardFilter.breed === 'All' || a.breed === dashboardFilter.breed;
      const matchesDashboardCategory = dashboardFilter.category === 'All' || (dashboardFilter.category === 'Calf' ? a.isCalf : !a.isCalf);

      return matchesSearch && matchesStatus && matchesDashboardBreed && matchesDashboardCategory;
    }).sort((a, b) => (a.dob || '').localeCompare(b.dob || ''));
  }, [animals, searchTerm, statusFilter, reproEvents, dashboardFilter, healthEvents, alerts]);

  const protocolEligibleAnimals = useMemo(() => {
    return animals
      .filter(a => a.status !== AnimalStatus.PREGNANT && a.status !== AnimalStatus.IN_PROTOCOL)
      .filter(a => a.tag.toLowerCase().includes(protocolAnimalSearch.toLowerCase()) || a.breed.toLowerCase().includes(protocolAnimalSearch.toLowerCase()));
  }, [animals, protocolAnimalSearch]);

  const reportSearchAnimals = useMemo(() => {
    if (!reportAnimalSearch) return [];
    return animals.filter(a =>
      a.tag.toLowerCase().includes(reportAnimalSearch.toLowerCase()) ||
      (a.name && a.name.toLowerCase().includes(reportAnimalSearch.toLowerCase()))
    ).slice(0, 5);
  }, [animals, reportAnimalSearch]);

  const filteredReproEvents = useMemo(() => {
    let filtered = reproEvents.filter(e => {
      const animal = animals.find(a => a.id === e.animalId);
      const matchesTag = !reproTagSearch || (animal?.tag.toLowerCase().includes(reproTagSearch.toLowerCase()));
      const matchesTech = reproTechFilter === 'All' || dateUtils.normalizeName(e.technician) === reproTechFilter;
      const matchesSemen = reproSemenFilter === 'All' || dateUtils.normalizeName(e.semenName || e.bullId) === reproSemenFilter;
      const matchesStart = !reproDateStart || e.date >= reproDateStart;
      const matchesEnd = !reproDateEnd || e.date <= reproDateEnd;
      return matchesTag && matchesTech && matchesSemen && matchesStart && matchesEnd;
    });

    return filtered.sort((a, b) => {
      if (reproSort === 'Date Desc') {
        return b.date.localeCompare(a.date);
      } else {
        return a.date.localeCompare(b.date);
      }
    });
  }, [reproEvents, animals, reproTagSearch, reproTechFilter, reproSemenFilter, reproDateStart, reproDateEnd, reproSort]);

  const pdChecks = useMemo(() => {
    return reproEvents.filter(e => e.type === ReproEventType.PREGNANCY_CHECK);
  }, [reproEvents]);

  const pdChecksByDate = useMemo(() => {
    const groups: { [date: string]: ReproductionEvent[] } = {};
    pdChecks.forEach(e => {
      if (!groups[e.date]) {
        groups[e.date] = [];
      }
      groups[e.date].push(e);
    });
    return groups;
  }, [pdChecks]);

  const dateBadges = useMemo(() => {
    return Object.keys(pdChecksByDate).sort((a, b) => b.localeCompare(a)).map(date => {
      const style = getBadgeStyleForDate(date);
      return {
        date,
        badgeNum: style.badgeNum,
        bg: style.bg,
        accent: style.accent,
        icon: style.icon,
        checks: pdChecksByDate[date]
      };
    });
  }, [pdChecksByDate]);

  const filteredPdChecks = useMemo(() => {
    return pdChecks.filter(e => {
      const animal = animals.find(a => a.id === e.animalId);
      const tag = animal?.tag || '';
      const dateStr = formatDateReadable(e.date);
      const search = pdSearchTerm.toLowerCase();
      
      const matchesSearch = tag.toLowerCase().includes(search) || 
                            e.date.includes(search) || 
                            dateStr.toLowerCase().includes(search);
      const matchesStart = !pdStartDate || e.date >= pdStartDate;
      const matchesEnd = !pdEndDate || e.date <= pdEndDate;

      return matchesSearch && matchesStart && matchesEnd;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [pdChecks, animals, pdSearchTerm, pdStartDate, pdEndDate]);

  const filteredHealthEvents = useMemo(() => {
    return healthEvents.filter(e => {
      const animal = animals.find(a => a.id === e.animalId);
      const matchesTag = !healthTagSearch || (animal?.tag.toLowerCase().includes(healthTagSearch.toLowerCase()));
      const matchesType = healthTypeFilter === 'All' || e.type === healthTypeFilter;
      const matchesTech = healthTechFilter === 'All' || dateUtils.normalizeName(e.technician) === healthTechFilter;
      const matchesMed = healthMedFilter === 'All' || dateUtils.normalizeName(e.medication) === healthMedFilter;
      const matchesStart = !healthDateStart || e.date >= healthDateStart;
      const matchesEnd = !healthDateEnd || e.date <= healthDateEnd;
      return matchesTag && matchesType && matchesTech && matchesMed && matchesStart && matchesEnd;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [healthEvents, animals, healthTagSearch, healthTypeFilter, healthTechFilter, healthMedFilter, healthDateStart, healthDateEnd]);

  // 1. Grouped usage data for reports chart
  const usageChartData = useMemo(() => {
    const usages: { name: string; qty: number; date: string }[] = [];
    healthEvents.forEach(e => {
      const treatList = e.treatments && e.treatments.length > 0
        ? e.treatments
        : (e.medication ? [{ name: e.medication, dose: e.dosage || '' }] : []);
      
      treatList.forEach(t => {
        if (!t.name) return;
        const match = t.dose.match(/^([\d.]+)/);
        const num = match ? parseFloat(match[1]) : 0;
        if (num > 0) {
          usages.push({ name: t.name, qty: num, date: e.date });
        }
      });
    });

    const groups: { [key: string]: { [med: string]: number } } = {};
    usages.forEach(u => {
      let groupKey = '';
      const dateObj = new Date(u.date);
      if (isNaN(dateObj.getTime())) return;
      
      if (reportsPeriod === 'daily') {
        groupKey = u.date;
      } else if (reportsPeriod === 'weekly') {
        const day = dateObj.getDay();
        const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(dateObj.setDate(diff)).toISOString().split('T')[0];
        groupKey = `W/C ${startOfWeek}`;
      } else if (reportsPeriod === 'monthly') {
        groupKey = dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
      } else {
        groupKey = dateObj.getFullYear().toString();
      }

      if (!groups[groupKey]) groups[groupKey] = {};
      groups[groupKey][u.name] = (groups[groupKey][u.name] || 0) + u.qty;
    });

    const chartData = Object.entries(groups).map(([period, medMap]) => {
      const row: any = { period };
      Object.entries(medMap).forEach(([med, qty]) => {
        row[med] = parseFloat(qty.toFixed(1));
      });
      return row;
    });

    chartData.sort((a, b) => a.period.localeCompare(b.period));
    return chartData.slice(-12);
  }, [healthEvents, reportsPeriod]);

  // 2. Predict next 30 days demand
  const demandPredictions = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const usagesLast30Days: { [name: string]: number } = {};
    
    healthEvents.forEach(e => {
      if (e.date >= thirtyDaysAgoStr) {
        const treatList = e.treatments && e.treatments.length > 0
          ? e.treatments
          : (e.medication ? [{ name: e.medication, dose: e.dosage || '' }] : []);
        
        treatList.forEach(t => {
          if (!t.name) return;
          const match = t.dose.match(/^([\d.]+)/);
          const num = match ? parseFloat(match[1]) : 0;
          if (num > 0) {
            usagesLast30Days[t.name] = (usagesLast30Days[t.name] || 0) + num;
          }
        });
      }
    });

    return medicines.map(m => {
      const pastUsage = usagesLast30Days[m.name] || 0;
      const projected = pastUsage; 
      const currentStock = (m.packs * m.loosePerPack) + m.loose;
      const shortfall = projected > currentStock ? parseFloat((projected - currentStock).toFixed(1)) : 0;
      const recommendedPacks = shortfall > 0 ? Math.ceil(shortfall / m.loosePerPack) : 0;

      return {
        medicine: m,
        pastUsage: parseFloat(pastUsage.toFixed(1)),
        projected: parseFloat(projected.toFixed(1)),
        currentStock,
        shortfall,
        recommendedPacks
      };
    });
  }, [healthEvents, medicines]);

  const uniqueReproTechs = useMemo(() => dateUtils.getUniqueNormalized(reproEvents.map(e => e.technician)), [reproEvents]);
  const uniqueHealthTechs = useMemo(() => dateUtils.getUniqueNormalized(healthEvents.map(e => e.technician)), [healthEvents]);
  const uniqueMedications = useMemo(() => dateUtils.getUniqueNormalized(healthEvents.map(e => e.medication)), [healthEvents]);
  const uniqueSemens = useMemo(() => dateUtils.getUniqueNormalized(reproEvents.map(e => e.semenName || e.bullId)), [reproEvents]);

  // Inseminated animals awaiting pregnancy check
  const inseminatedAnimals = useMemo(() => {
    return animals.filter(a => a.status === AnimalStatus.INSEMINATED);
  }, [animals]);

  // Health patient search autocomplete
  const healthPatientSearchResults = useMemo(() => {
    if (!healthPatientSearch || healthPatientSearch.length < 1) return [];
    return animals.filter(a =>
      a.tag.toLowerCase().includes(healthPatientSearch.toLowerCase()) ||
      (a.name?.toLowerCase().includes(healthPatientSearch.toLowerCase()))
    ).slice(0, 6);
  }, [animals, healthPatientSearch]);

  // Adults and Calves separation
  const adultAnimals = useMemo(() => filteredAnimals.filter(a => !a.isCalf), [filteredAnimals]);
  const calfAnimals = useMemo(() => animals.filter(a => a.isCalf && (
    !searchTerm ||
    a.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  )), [animals, searchTerm]);

  const recentLogs = useMemo(() => {
    const combined = [
      ...reproEvents.map(e => ({ ...e, logType: 'Repro' })),
      ...healthEvents.map(e => ({ ...e, logType: 'Health' }))
    ].sort((a, b) => b.date.localeCompare(a.date));
    return combined.slice(0, 10);
  }, [reproEvents, healthEvents]);

  // --- Analytics Data Processing ---
  const reproductionTrends = useMemo(() => {
    const monthlyData: Record<string, { month: string, inseminations: number, pregnancies: number, calvings: number }> = {};
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().slice(0, 7);
    });

    last6Months.forEach(m => {
      monthlyData[m] = { month: m, inseminations: 0, pregnancies: 0, calvings: 0 };
    });

    reproEvents.forEach(e => {
      const m = e.date.slice(0, 7);
      if (monthlyData[m]) {
        if (e.type === ReproEventType.INSEMINATION) monthlyData[m].inseminations++;
        if (e.type === ReproEventType.PREGNANCY_CHECK && e.success) monthlyData[m].pregnancies++;
        if (e.type === ReproEventType.CALVING) monthlyData[m].calvings++;
      }
    });

    return Object.values(monthlyData);
  }, [reproEvents]);

  const healthTrends = useMemo(() => {
    const monthlyData: Record<string, { month: string, treatments: number, cases: number }> = {};
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().slice(0, 7);
    });

    last6Months.forEach(m => {
      monthlyData[m] = { month: m, treatments: 0, cases: 0 };
    });

    healthEvents.forEach(e => {
      const m = e.date.slice(0, 7);
      if (monthlyData[m]) {
        monthlyData[m].treatments++;
        if (e.type === HealthEventType.ILLNESS) monthlyData[m].cases++;
      }
    });

    return Object.values(monthlyData);
  }, [healthEvents]);

  const diseaseFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    healthEvents.filter(e => e.type === HealthEventType.ILLNESS).forEach(e => {
      const name = e.details || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [healthEvents]);

  const conceptionRateTrends = useMemo(() => {
    const monthlyData: Record<string, { month: string, rate: number }> = {};
    const last6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toISOString().slice(0, 7);
    });

    last6Months.forEach(m => {
      const insemThisMonth = reproEvents.filter(e => e.type === ReproEventType.INSEMINATION && e.date.slice(0, 7) === m).length;
      const pregFromThisMonth = reproEvents.filter(e => e.type === ReproEventType.PREGNANCY_CHECK && e.success && e.date.slice(0, 7) === m).length;
      const rate = insemThisMonth > 0 ? Math.round((pregFromThisMonth / insemThisMonth) * 100) : 0;
      monthlyData[m] = { month: m, rate };
    });

    return Object.values(monthlyData);
  }, [reproEvents]);

  const recentAnalyticsActivities = useMemo(() => {
    const combined = [
      ...reproEvents.map(e => ({ ...e, logType: 'Repro' as const })),
      ...healthEvents.map(e => ({ ...e, logType: 'Health' as const }))
    ].sort((a, b) => b.date.localeCompare(a.date));
    return combined.slice(0, 10);
  }, [reproEvents, healthEvents]);

  const dashboardStats = useMemo(() => {
    const filtered = animals.filter(a => {
      const matchesBreed = dashboardFilter.breed === 'All' || a.breed === dashboardFilter.breed;
      const matchesCategory = dashboardFilter.category === 'All' || (dashboardFilter.category === 'Calf' ? a.isCalf : !a.isCalf);
      return matchesBreed && matchesCategory;
    });

    const statuses = filtered.map(a => a.status);
    const today = dateUtils.today();
    
    const bredAnimalIds = new Set(reproEvents.filter(e => e.type === ReproEventType.INSEMINATION).map(e => e.animalId));
    const pregnant = statuses.filter(s => s === AnimalStatus.PREGNANT || s === AnimalStatus.CLOSEUP).length;
    const totalBredAcrossFiltered = filtered.filter(a => bredAnimalIds.has(a.id)).length;
    const conceptionRate = totalBredAcrossFiltered > 0 ? Math.round((pregnant / totalBredAcrossFiltered) * 100) : 0;

    const repeatBreeders = filtered.filter(a => {
      const insemCount = reproEvents.filter(e => e.animalId === a.id && e.type === ReproEventType.INSEMINATION).length;
      return insemCount >= 3 && a.status !== AnimalStatus.PREGNANT;
    }).length;

    const sevenDaysAgo = dateUtils.addDays(today, -7);
    const recentlyTreated = Array.from(new Set(healthEvents.filter(e => e.date >= sevenDaysAgo && filtered.some(a => a.id === e.animalId)).map(e => e.animalId))).length;

    const inHeatCount = filtered.filter(a => {
      const animalEvents = reproEvents.filter(e => e.animalId === a.id);
      const latestHeat = animalEvents
        .filter(e => e.type === ReproEventType.ESTRUS)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      return latestHeat && latestHeat.date === today;
    }).length;

    const relevantAlerts = alerts.filter(al => al.animalId ? filtered.some(a => a.id === al.animalId) : true);

    return {
      total: filtered.filter(a => !a.isCalf).length,
      pregnant,
      open: statuses.filter(s => s === AnimalStatus.ACTIVE || s === AnimalStatus.IN_PROTOCOL || s === AnimalStatus.INSEMINATED).length,
      repeatBreeders,
      inHeat: inHeatCount,
      heatDue: relevantAlerts.filter(al => al.title.includes('Heat Check')).length,
      dry: statuses.filter(s => s === AnimalStatus.DRY).length,
      calvingDue: relevantAlerts.filter(al => al.title.includes('Calving') && !al.title.includes('OVERDUE')).length,
      overdueCalving: relevantAlerts.filter(al => al.title.includes('Calving OVERDUE')).length,
      sick: statuses.filter(s => s === AnimalStatus.SICK).length,
      underObservation: statuses.filter(s => s === AnimalStatus.OBSERVATION).length,
      recentlyTreated,
      conceptionRate,
      calves: filtered.filter(a => a.isCalf).length,
      inProtocol: statuses.filter(s => s === AnimalStatus.IN_PROTOCOL).length,
      totalFemales: filtered.filter(a => a.sex === 'Female').length,
    };
  }, [animals, reproEvents, healthEvents, alerts, dashboardFilter]);

  const statusDistribution = useMemo(() => {
    return [
      { name: 'Pregnant', value: dashboardStats.pregnant || 0, color: '#10B981' },
      { name: 'Open (Ready)', value: dashboardStats.open || 0, color: '#3B82F6' },
      { name: 'In Heat', value: dashboardStats.inHeat || 0, color: '#F59E0B' },
      { name: 'Sick Cases', value: dashboardStats.sick || 0, color: '#EF4444' },
      { name: 'Dry Cows', value: dashboardStats.dry || 0, color: '#64748B' },
    ].filter(item => item.value > 0);
  }, [dashboardStats]);

  // Auto Backup System
  useEffect(() => {
    const lastBackup = localStorage.getItem('agrovet_backup_time');
    const now = new Date().getTime();
    if (!lastBackup || now - parseInt(lastBackup) > 24 * 60 * 60 * 1000) {
      const data = {
        exportDate: new Date().toISOString(),
        animals, reproEvents, healthEvents, enrollments, settings
      };
      localStorage.setItem('agrovet_auto_backup', JSON.stringify(data));
      localStorage.setItem('agrovet_backup_time', now.toString());
    }

    // Auto-Archive protocols > 100 days old
    enrollments.forEach(enr => {
      if (enr.status === 'Completed' || enr.status === 'Failed') {
        const daysSince = dateUtils.diffDays(new Date().toISOString().split('T')[0], enr.startDate);
        if (daysSince > 100) {
          updateEnrollment({ ...enr, status: 'Archived' });
        }
      }
    });
  }, [animals, reproEvents, healthEvents, enrollments, settings]);

  const todaySteps = useMemo(() => {
    const today = dateUtils.today();
    const steps: any[] = [];
    enrollments.filter(e => e.status === 'Active').forEach(enr => {
      const template = protocols.find(t => t.id === enr.templateId);
      if (!template) return;
      const stepIdx = enr.completedStepIndices.length;
      if (stepIdx < template.steps.length) {
        const step = template.steps[stepIdx];
        const stepDate = dateUtils.addDays(enr.startDate, step.dayOffset);
        if (stepDate <= today) {
          steps.push({ enrollment: enr, stepIndex: stepIdx, step, template });
        }
      }
    });
    return steps;
  }, [enrollments, protocols]);

  const markTodayStepsDone = () => {
    enrollments.filter(enr => {
      const template = protocols.find(t => t.id === enr.templateId);
      if (!template) return false;
      const stepIdx = enr.completedStepIndices.length;
      if (stepIdx < template.steps.length) {
        const step = template.steps[stepIdx];
        return dateUtils.addDays(enr.startDate, step.dayOffset) <= dateUtils.today();
      }
      return false;
    }).forEach(enr => {
      handleGroupStepDone(enr);
    });
    alert("Today's batch steps marked as done!");
  };

  const handleAddAnimal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAnimal.tag) {
      const normalizedAnimal = {
        ...newAnimal,
        tag: dateUtils.normalizeName(newAnimal.tag),
        name: newAnimal.name ? dateUtils.normalizeName(newAnimal.name) : newAnimal.name,
        herd: newAnimal.herd ? dateUtils.normalizeName(newAnimal.herd) : newAnimal.herd
      };
      if (editingAnimalId) {
        updateAnimal(normalizedAnimal as Animal);
        setEditingAnimalId(null);
      } else {
        addAnimal({
          ...normalizedAnimal,
          id: Math.random().toString(36).substr(2, 9),
          dob: normalizedAnimal.isCalf ? (normalizedAnimal.dob || new Date().toISOString().split('T')[0]) : '',
        } as Animal);
      }
      setIsAnimalFormOpen(false);
      setNewAnimal({ sex: 'Female', breed: 'Holstein', herd: 'Main Herd', isCalf: false });
    }
  };

  const handleAddRepro = (e: React.FormEvent) => {
    handleCalvingWithCalf(e);
  };

  const handleAddHealth = (e: React.FormEvent) => {
    e.preventDefault();
    
    const activeAnimals = treatmentAnimalType === 'single' 
      ? (newHealth.animalId ? [newHealth.animalId] : [])
      : selectedMultipleAnimals;

    if (activeAnimals.length === 0) {
      setToastMessage('⚠️ Please select at least one animal patient.');
      return;
    }

    if (!newHealth.type) {
      setToastMessage('⚠️ Please select a health category.');
      return;
    }

    const finalTreatments = newHealth.treatments && newHealth.treatments.length > 0
      ? newHealth.treatments
      : (newHealth.medication ? [{ name: newHealth.medication, dose: newHealth.dosage || '' }] : []);

    const updatedMedicines = [...medicines];
    const lowStockMessages: string[] = [];

    finalTreatments.forEach(treatment => {
      if (!treatment.name) return;
      
      const parsed = treatment.dose.match(/^([\d.]+)/);
      const singleDose = parsed ? parseFloat(parsed[1]) : 0;
      const totalDose = singleDose * activeAnimals.length;

      if (totalDose > 0) {
        const medIndex = updatedMedicines.findIndex(m => m.name.toLowerCase() === treatment.name.trim().toLowerCase());
        if (medIndex !== -1) {
          const med = updatedMedicines[medIndex];
          let currentPacks = med.packs;
          let currentLoose = med.loose;
          const totalStockUnits = (currentPacks * med.loosePerPack) + currentLoose;

          if (totalStockUnits < totalDose) {
            currentPacks = 0;
            currentLoose = 0;
          } else {
            const packsToDeduct = Math.floor(totalDose / med.loosePerPack);
            let remainingDose = totalDose % med.loosePerPack;

            if (currentPacks >= packsToDeduct) {
              currentPacks -= packsToDeduct;
            } else {
              const equivalentLoose = currentPacks * med.loosePerPack;
              currentPacks = 0;
              currentLoose += equivalentLoose;
            }

            if (currentLoose >= remainingDose) {
              currentLoose -= remainingDose;
            } else {
              if (currentPacks > 0) {
                currentPacks -= 1;
                currentLoose += med.loosePerPack;
                currentLoose -= remainingDose;
              } else {
                currentLoose = 0;
              }
            }
          }

          updatedMedicines[medIndex] = {
            ...med,
            packs: currentPacks,
            loose: currentLoose
          };

          const newTotalUnits = (currentPacks * med.loosePerPack) + currentLoose;
          if (newTotalUnits < med.minStockLevel) {
            lowStockMessages.push(
              `⚠️ Low Stock: ${med.name} is down to ${currentPacks} packs + ${currentLoose} ${med.unit} (minimum required: ${med.minStockLevel} ${med.unit})`
            );
          }
        }
      }
    });

    saveMedicinesDirectly(updatedMedicines);

    if (lowStockMessages.length > 0) {
      setLowStockAlerts(prev => [
        ...prev,
        ...lowStockMessages.map(msg => ({ id: Math.random().toString(), msg }))
      ]);
    }

    activeAnimals.forEach(animalId => {
      const normalizedHealth = {
        ...newHealth,
        animalId,
        treatments: finalTreatments,
        technician: newHealth.technician ? dateUtils.normalizeName(newHealth.technician) : '',
        medication: finalTreatments[0]?.name || '',
        dosage: finalTreatments[0]?.dose || ''
      };

      if (editingHealthId) {
        updateHealthEvent(normalizedHealth as HealthEvent);
      } else {
        addHealthEvent({
          ...normalizedHealth,
          id: Math.random().toString(36).substr(2, 9),
          date: normalizedHealth.date || new Date().toISOString().split('T')[0],
        } as HealthEvent);
      }
    });

    setEditingHealthId(null);
    setIsHealthFormOpen(false);
    setSelectedAnimal(null);
    setNewHealth({ type: HealthEventType.ILLNESS, date: new Date().toISOString().split('T')[0] });
    setHealthAnimalSearch('');
    setSelectedMultipleAnimals([]);
    setTreatmentAnimalType('single');
    setToastMessage(`Logged clinical entry for ${activeAnimals.length} animal(s). Stock updated.`);
  };

  const handleAddMedicineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedicine.name) return;

    const formattedMedicine: Medicine = {
      id: editingMedicineId || Math.random().toString(36).substr(2, 9),
      name: dateUtils.normalizeName(newMedicine.name),
      category: newMedicine.category || 'Injection',
      unit: newMedicine.unit || 'ml',
      packs: Number(newMedicine.packs) || 0,
      loose: Number(newMedicine.loose) || 0,
      loosePerPack: Number(newMedicine.loosePerPack) || 100,
      minStockLevel: Number(newMedicine.minStockLevel) || 50
    };

    if (editingMedicineId) {
      updateMedicine(formattedMedicine);
      setEditingMedicineId(null);
      setToastMessage(`Updated medicine "${formattedMedicine.name}" in inventory.`);
    } else {
      addMedicine(formattedMedicine);
      setToastMessage(`Added "${formattedMedicine.name}" to medicine inventory.`);
    }

    setIsMedicineFormOpen(false);
    setNewMedicine({ name: '', category: 'Injection', unit: 'ml', packs: 0, loose: 0, loosePerPack: 100, minStockLevel: 50 });
  };

  const handlePregnancyCheck = () => {
    if (!pregnancyCheckTarget || !pregnancyCheckResult) return;
    const isPregnant = pregnancyCheckResult === 'Pregnant';
    addReproEvent({
      id: Math.random().toString(36).substr(2, 9),
      animalId: pregnancyCheckTarget.id,
      type: ReproEventType.PREGNANCY_CHECK,
      date: new Date().toISOString().split('T')[0],
      details: `Pregnancy check result: ${pregnancyCheckResult}`,
      success: isPregnant,
      pregnancyResult: pregnancyCheckResult,
    } as ReproductionEvent);
    setIsPregnancyCheckModalOpen(false);
    setPregnancyCheckTarget(null);
    setPregnancyCheckResult('');
  };

  const handleCalvingWithCalf = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRepro.animalId && newRepro.type) {
      try {
        const animal = animals.find(a => a.id === newRepro.animalId);
        const normalizedRepro = {
          ...newRepro,
          technician: newRepro.technician ? dateUtils.normalizeName(newRepro.technician) : '',
          semenName: newRepro.semenName ? dateUtils.normalizeName(newRepro.semenName) : '',
          bullId: newRepro.bullId ? dateUtils.normalizeName(newRepro.bullId) : ''
        };
        validations.validateReproductionEvent(normalizedRepro, animal?.status || AnimalStatus.ACTIVE);
        const reproId = Math.random().toString(36).substr(2, 9);
        addReproEvent({
          ...normalizedRepro,
          id: reproId,
          date: normalizedRepro.date || new Date().toISOString().split('T')[0],
        } as ReproductionEvent);
        // Auto Remove After Insemination
        if (newRepro.type === ReproEventType.INSEMINATION) {
          const activeEnrolls = enrollments.filter(e => e.animalId === newRepro.animalId && e.status === 'Active');
          activeEnrolls.forEach(enr => {
            updateEnrollment({ ...enr, status: 'Completed' });
          });
        }

        // Auto-add calf if calving event
        if (newRepro.type === ReproEventType.CALVING) {
          const calfTag = newRepro.offspringTag || `CALF-${animal?.tag}-${Date.now().toString().slice(-4)}`;
          const calfId = Math.random().toString(36).substr(2, 9);
          addAnimal({
            id: calfId,
            tag: calfTag,
            name: '',
            breed: animal?.breed || 'Unknown',
            sex: (newRepro.offspringGender as 'Male' | 'Female') || 'Female',
            dob: newRepro.date || new Date().toISOString().split('T')[0],
            herd: animal?.herd || 'Main Herd',
            motherId: newRepro.animalId,
            fatherId: newRepro.bullId,
            isCalf: true,
          } as Animal);
        }
        setIsReproFormOpen(false);
        setSelectedAnimal(null); // Auto-close animal profile when form is submitted
        setNewRepro({ type: ReproEventType.ESTRUS, date: new Date().toISOString().split('T')[0] });
        setReproAnimalSearch('');
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleSaveNewPdCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdAnimalId.trim()) {
      alert('Please enter an Animal ID/Tag');
      return;
    }
    if (!pdResult) {
      alert('Please select a pregnancy result');
      return;
    }

    let animal = animals.find(a => a.tag.toLowerCase() === pdAnimalId.trim().toLowerCase());
    if (!animal) {
      // Auto-create animal to make it extremely easy and fluid
      const newId = Math.random().toString(36).substr(2, 9);
      const newTag = pdAnimalId.trim();
      animal = {
        id: newId,
        tag: newTag,
        name: newTag,
        breed: 'Holstein',
        sex: 'Female',
        dob: dateUtils.addDays(dateUtils.today(), -3 * 365), // Default to 3 years old
        herd: 'Main Herd',
        isCalf: false
      };
      addAnimal(animal);
    }

    const isPregnant = pdResult === 'Pregnant';
    const newEvent: ReproductionEvent = {
      id: Math.random().toString(36).substr(2, 9),
      animalId: animal.id,
      type: ReproEventType.PREGNANCY_CHECK,
      date: dateUtils.today(),
      success: isPregnant,
      pregnancyResult: isPregnant ? 'Pregnant' : 'Non-Pregnant',
      details: pdNotes || 'Pregnancy Diagnosis Check (Today)'
    };

    addReproEvent(newEvent);
    setToastMessage(`🤰 Saved check for Cow ${pdAnimalId}!`);
    
    // Reset form states
    setPdAnimalId('');
    setPdResult('');
    setPdNotes('');
    setIsNewPdFormOpen(false);

    // Return to dashboard!
    setView('dashboard');
  };

  const handleSaveOldPdCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPdAnimalId.trim()) {
      alert('Please enter an Animal ID/Tag');
      return;
    }
    if (!oldPdDate) {
      alert('Please select a date');
      return;
    }
    if (!oldPdResult) {
      alert('Please select a pregnancy result');
      return;
    }

    let animal = animals.find(a => a.tag.toLowerCase() === oldPdAnimalId.trim().toLowerCase());
    if (!animal) {
      // Auto-create animal
      const newId = Math.random().toString(36).substr(2, 9);
      const newTag = oldPdAnimalId.trim();
      animal = {
        id: newId,
        tag: newTag,
        name: newTag,
        breed: 'Holstein',
        sex: 'Female',
        dob: dateUtils.addDays(oldPdDate, -3 * 365), // 3 years old relative to event date
        herd: 'Main Herd',
        isCalf: false
      };
      addAnimal(animal);
    }

    const isPregnant = oldPdResult === 'Pregnant';
    const newEvent: ReproductionEvent = {
      id: Math.random().toString(36).substr(2, 9),
      animalId: animal.id,
      type: ReproEventType.PREGNANCY_CHECK,
      date: oldPdDate,
      success: isPregnant,
      pregnancyResult: isPregnant ? 'Pregnant' : 'Non-Pregnant',
      details: oldPdNotes || 'Pregnancy Diagnosis Check (Past Date)'
    };

    addReproEvent(newEvent);
    
    // Format the date for the success message e.g., "June 30, 2026"
    const formattedDate = formatDateReadable(oldPdDate);
    setToastMessage(`✅ Added check for ${formattedDate}!`);

    // Reset form states
    setOldPdAnimalId('');
    setOldPdResult('');
    setOldPdNotes('');
    setOldPdDate(dateUtils.today());
    setIsOldPdFormOpen(false);
  };

  const handleSaveMultiPdCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!multiPdText.trim()) {
      alert('Please paste or enter checks list');
      return;
    }
    if (!multiPdDate) {
      alert('Please select a date');
      return;
    }

    const lines = multiPdText.split('\n');
    let addedCount = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let result: 'Pregnant' | 'Open' = 'Pregnant';
      let tag = trimmed;

      const lower = trimmed.toLowerCase();
      if (lower.endsWith('pregnant') || lower.endsWith('preg')) {
        result = 'Pregnant';
        tag = trimmed.substring(0, trimmed.lastIndexOf(' ')).trim();
      } else if (lower.endsWith('open')) {
        result = 'Open';
        tag = trimmed.substring(0, trimmed.lastIndexOf(' ')).trim();
      } else {
        // If no explicit word is matched at the end, try searching for keywords inside the line
        const matchPreg = trimmed.match(/(.+)\s+(pregnant|preg|🤰)/i);
        const matchOpen = trimmed.match(/(.+)\s+(open|❌)/i);
        if (matchPreg) {
          tag = matchPreg[1].trim();
          result = 'Pregnant';
        } else if (matchOpen) {
          tag = matchOpen[1].trim();
          result = 'Open';
        } else {
          // Fallback: split by space, first word is tag, second is result
          const parts = trimmed.split(/\s+/);
          if (parts.length >= 2) {
            tag = parts[0];
            const second = parts[1].toLowerCase();
            result = (second.startsWith('preg') || second.startsWith('p') || second.includes('🤰')) ? 'Pregnant' : 'Open';
          }
        }
      }

      // Clean up tag
      tag = tag.replace(/[,;:]+$/, '').trim();
      if (!tag) return;

      // Find or create animal
      let animal = animals.find(a => a.tag.toLowerCase() === tag.toLowerCase());
      if (!animal) {
        const newId = Math.random().toString(36).substr(2, 9);
        animal = {
          id: newId,
          tag: tag,
          name: tag,
          breed: 'Holstein',
          sex: 'Female',
          dob: dateUtils.addDays(multiPdDate, -3 * 365),
          herd: 'Main Herd',
          isCalf: false
        };
        addAnimal(animal);
      }

      // Create event
      const isPregnant = result === 'Pregnant';
      addReproEvent({
        id: Math.random().toString(36).substr(2, 9),
        animalId: animal.id,
        type: ReproEventType.PREGNANCY_CHECK,
        date: multiPdDate,
        success: isPregnant,
        pregnancyResult: isPregnant ? 'Pregnant' : 'Non-Pregnant',
        details: 'Bulk Entry Pregnancy Diagnosis'
      } as ReproductionEvent);

      addedCount++;
    });

    const formattedDate = formatDateReadable(multiPdDate);
    setToastMessage(`✅ Added ${addedCount} checks for ${formattedDate}`);
    
    // Reset form states
    setMultiPdText('');
    setMultiPdDate(dateUtils.today());
    setIsMultiPdFormOpen(false);
  };

  const handleEditAnimal = (animal: Animal, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAnimalId(animal.id);
    setNewAnimal(animal);
    setIsAnimalFormOpen(true);
  };

  const handleDeleteAnimal = (animal: Animal, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to delete Cow ${animal.tag}? This action cannot be undone.`,
      onConfirm: () => { deleteAnimal(animal.id); setSelectedAnimal(null); setConfirmDialog(d => ({ ...d, isOpen: false })); }
    });
  };

  const handleDeleteRepro = (event: ReproductionEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const animal = animals.find(a => a.id === event.animalId);
    setConfirmDialog({
      isOpen: true,
      message: `Delete ${event.type} event for ${animal?.tag || 'animal'} on ${event.date}?`,
      onConfirm: () => { deleteReproEvent(event.id); setConfirmDialog(d => ({ ...d, isOpen: false })); }
    });
  };

  const handleDeleteHealth = (event: HealthEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const animal = animals.find(a => a.id === event.animalId);
    setConfirmDialog({
      isOpen: true,
      message: `Delete ${event.type} record for ${animal?.tag || 'animal'} on ${event.date}?`,
      onConfirm: () => { deleteHealthEvent(event.id); setConfirmDialog(d => ({ ...d, isOpen: false })); }
    });
  };

  const handleEditRepro = (event: ReproductionEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingReproId(event.id);
    setNewRepro(event);
    const animal = animals.find(a => a.id === event.animalId);
    if (animal) setReproAnimalSearch(animal.tag);
    setIsReproFormOpen(true);
  };

  const exportBackup = () => {
    const data = {
      exportDate: new Date().toISOString(),
      animals,
      reproEvents,
      healthEvents,
      enrollments,
      customProtocols,
      settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrovet_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEnrollment.animalIds && newEnrollment.animalIds.length > 0 && newEnrollment.templateId) {
      if (newEnrollment.id) {
        // Adding to existing group
        const existing = enrollments.find(en => en.id === newEnrollment.id);
        if (existing) {
          const updated = {
            ...existing,
            animalIds: Array.from(new Set([...existing.animalIds, ...newEnrollment.animalIds]))
          };
          updateEnrollment(updated as ProtocolEnrollment);
        }
      } else {
        // Creating new group
        const enrollmentId = Math.random().toString(36).substr(2, 9);
        addEnrollment({
          id: enrollmentId,
          animalIds: newEnrollment.animalIds,
          templateId: newEnrollment.templateId!,
          status: 'Active',
          completedStepIndices: [],
          startDate: newEnrollment.startDate || new Date().toISOString().split('T')[0]
        } as ProtocolEnrollment);
      }

      setIsEnrollmentFormOpen(false);
      setNewEnrollment({ startDate: new Date().toISOString().split('T')[0], animalIds: [] });
      setProtocolAnimalSearch('');
    }
  };

  const handleGroupStepDone = (enrollment: ProtocolEnrollment) => {
    const template = protocols.find(t => t.id === enrollment.templateId);
    if (!template) return;

    const nextStepIndex = template.steps.findIndex((_, idx) => !enrollment.completedStepIndices.includes(idx));
    if (nextStepIndex === -1) return;

    const nextStep = template.steps[nextStepIndex];

    if (nextStep.isAI) {
      // Start AI Sequential Workflow
      setAiWorkflow({ groupId: enrollment.id, currentAnimalIndex: 0 });
    } else {
      // Just mark step done for group
      const updated = {
        ...enrollment,
        completedStepIndices: [...enrollment.completedStepIndices, nextStepIndex]
      };
      // If all steps done, mark completed
      if (updated.completedStepIndices.length === template.steps.length) {
        updated.status = 'Completed';
      }
      updateEnrollment(updated as ProtocolEnrollment);
    }
  };

  const handleAIStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiWorkflow) return;

    const enrollment = enrollments.find(en => en.id === aiWorkflow.groupId);
    if (!enrollment) return;

    const animalId = enrollment.animalIds[aiWorkflow.currentAnimalIndex];

    // 1. Add Repro Event
    addReproEvent({
      id: Math.random().toString(36).substr(2, 9),
      animalId,
      type: ReproEventType.INSEMINATION,
      date: newRepro.date || new Date().toISOString().split('T')[0],
      details: newRepro.details || 'AI Step in Protocol',
      technician: newRepro.technician,
      semenName: newRepro.semenName,
      success: true,
      protocolId: enrollment.id
    } as ReproductionEvent);

    // 2. Advance or Finish
    if (aiWorkflow.currentAnimalIndex < enrollment.animalIds.length - 1) {
      setAiWorkflow({ ...aiWorkflow, currentAnimalIndex: aiWorkflow.currentAnimalIndex + 1 });
      // Reset form fields for next animal but keep technician/semen if desired? 
      // User said: "I enter Tech name, Semen details -> Click Save -> Next cow opens automatically"
      // Usually keep the same tech/semen for the batch but let user edit if needed.
    } else {
      // All animals done! Mark step as completed for the group
      const template = protocols.find(t => t.id === enrollment.templateId);
      const nextStepIndex = template?.steps.findIndex((_, idx) => !enrollment.completedStepIndices.includes(idx)) ?? -1;

      const updated = {
        ...enrollment,
        completedStepIndices: [...enrollment.completedStepIndices, nextStepIndex]
      };
      if (template && updated.completedStepIndices.length === template.steps.length) {
        updated.status = 'Completed';
      }
      updateEnrollment(updated as ProtocolEnrollment);
      setAiWorkflow(null);
      setNewRepro({ type: ReproEventType.ESTRUS, date: new Date().toISOString().split('T')[0] });
    }
  };

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTemplate.name && newTemplate.steps && newTemplate.steps.length > 0) {
      addCustomProtocol({
        ...newTemplate,
        id: Math.random().toString(36).substr(2, 9),
        isPredefined: false
      } as ProtocolTemplate);
      setIsTemplateFormOpen(false);
      setNewTemplate({ name: '', description: '', steps: [{ dayOffset: 0, action: '', isAI: false, time: '08:00' }], isPredefined: false });
    }
  };

  const executeReportExport = () => {
    const rangeLabel = (reportStartDate || reportEndDate)
      ? `${reportStartDate || 'Start'} to ${reportEndDate || 'End'}`
      : 'Full Record';

    switch (selectedReportType) {
      case 'summary':
        generateDashboardPDF(stats, animals, settings);
        break;
      case 'repro': {
        const filtered = reproEvents.filter(e =>
          (!reportStartDate || e.date >= reportStartDate) &&
          (!reportEndDate || e.date <= reportEndDate)
        );
        generateReproSectionReport(filtered, animals, settings, reproEvents, rangeLabel);
        break;
      }
      case 'pd-check': {
        const filtered = reproEvents.filter(e =>
          e.type === ReproEventType.PREGNANCY_CHECK &&
          (!reportStartDate || e.date >= reportStartDate) &&
          (!reportEndDate || e.date <= reportEndDate)
        );
        generatePdCheckSectionReport(filtered, animals, settings, rangeLabel);
        break;
      }
      case 'health': {
        const filtered = healthEvents.filter(e =>
          (!reportStartDate || e.date >= reportStartDate) &&
          (!reportEndDate || e.date <= reportEndDate)
        );
        generateHealthSectionReport(filtered, animals, settings, rangeLabel);
        break;
      }
      case 'treatment-analysis': {
        const filtered = healthEvents.filter(e =>
          (!reportStartDate || e.date >= reportStartDate) &&
          (!reportEndDate || e.date <= reportEndDate)
        );
        generateTreatmentAnalysisReport(filtered, animals, settings, rangeLabel);
        break;
      }
      case 'medicine-inventory': {
        generateMedicineInventoryReport(medicines, settings);
        break;
      }
      case 'low-stock': {
        generateLowStockReport(medicines, settings);
        break;
      }
      case 'demand-forecast': {
        generateDemandForecastReport(demandPredictions, settings);
        break;
      }
      case 'individual': {
        const animal = animals.find(a => a.id === reportAnimalId);
        if (!animal) {
          alert('Please select an animal first.');
          return;
        }
        const filteredRepros = reproEvents.filter(e =>
          e.animalId === animal.id &&
          (!reportStartDate || e.date >= reportStartDate) &&
          (!reportEndDate || e.date <= reportEndDate)
        );
        const filteredHealths = healthEvents.filter(e =>
          e.animalId === animal.id &&
          (!reportStartDate || e.date >= reportStartDate) &&
          (!reportEndDate || e.date <= reportEndDate)
        );
        generateIndividualAnimalReport(animal, filteredRepros, filteredHealths, rangeLabel, settings);
        break;
      }
    }
  };

  const NavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: ViewState }) => (
    <button
      onClick={() => { setView(id); setIsSidebarOpen(false); }}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-300 ${view === id
        ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-[1.02]'
        : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
        }`}
    >
      <Icon className="w-6 h-6" />
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-inter">
        <Activity className="w-16 h-16 text-blue-600 animate-pulse mb-6" />
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Syncing Database...</h2>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex font-inter overflow-hidden relative ${isDesktop ? 'flex-row' : 'flex-col pb-20'} ${isSimulated ? 'h-full w-full' : 'min-h-screen'}`}>
      {/* Sidebar Overlay */}
      {isSidebarOpen && !isDesktop && (
        <div className={`${isSimulated ? 'absolute' : 'fixed'} inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]`} onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${isSimulated ? 'absolute' : 'fixed'} inset-y-0 left-0 z-[110] w-72 bg-white border-r border-slate-100 transform transition-transform duration-500 ${isDesktop ? 'translate-x-0 static block' : (isSidebarOpen ? 'translate-x-0' : '-translate-x-full')} h-full`}>
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center gap-4 mb-14 px-2">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-100 animate-pulse">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter">Asad's<span className="text-blue-600">Farm</span></h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest -mt-1">Management</p>
            </div>
          </div>

          <nav className="flex-1 space-y-3">
            <NavItem icon={LayoutDashboard} label="Dashboard" id="dashboard" />
            <NavItem icon={Users} label="Herd Hub" id="animals" />
            <NavItem icon={CalendarRange} label="Reproduction" id="repro" />
            <NavItem icon={CheckCircle2} label="PD Check" id="pd-check" />
            <NavItem icon={Stethoscope} label="Health Bay" id="health" />
            <NavItem icon={FlaskConical} label="Protocol Lab" id="protocols" />
            <NavItem icon={FileText} label="Report Center" id="reports" />
            <NavItem icon={SettingsIcon} label="Configurations" id="settings" />
          </nav>

          <div className="mt-auto p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-[1.25rem] bg-white flex items-center justify-center text-blue-600 font-black text-xl shadow-sm border border-slate-100 flex-shrink-0">
                {settings.farmName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800 truncate leading-tight mb-0.5">{settings.farmName}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{user?.email || 'Field Operative'}</p>
              </div>
            </div>
            <button onClick={onLogout} className="w-full py-3.5 bg-white border border-slate-200 text-slate-600 text-[11px] font-black rounded-[1.25rem] uppercase tracking-widest hover:bg-slate-100 hover:text-slate-800 transition-all shadow-sm">
              Secure Sign Out
            </button>
          </div>
        </div>
      </aside>


      {/* Searchable Dropdowns (Datalists) */}
      <datalist id="all-cow-tags">
        {animals.map((a) => (
          <option key={a.id} value={a.tag}>{a.tag} - {a.breed}</option>
        ))}
      </datalist>
      <datalist id="all-technicians">
        {Array.from(new Set([...reproEvents.map(e => e.technician), ...healthEvents.map(e => e.technician)])).filter(Boolean).map((t, i) => (
          <option key={i} value={t as string} />
        ))}
      </datalist>
      <datalist id="all-semen">
        {Array.from(new Set(reproEvents.map(e => e.semenName || e.bullId))).filter(Boolean).map((s, i) => (
          <option key={i} value={s as string} />
        ))}
      </datalist>
      <datalist id="all-diseases">
        <option value="Mastitis" />
        <option value="Lameness" />
        <option value="Metritis" />
        <option value="Ketosis" />
        <option value="Milk Fever" />
      </datalist>

      {/* Main Content Area */}
      <main className={`flex-1 min-w-0 flex flex-col relative overflow-hidden ${isSimulated ? 'h-full' : 'h-screen'}`}>
        {/* Universal Header */}
        <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-[90] border-b border-slate-100 px-6 md:px-10 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button onClick={() => setIsSidebarOpen(true)} className={`p-3 hover:bg-slate-100 rounded-2xl transition-all ${isDesktop ? 'hidden' : 'block'}`}>
              <Menu className="w-7 h-7 text-slate-600" />
            </button>
            <h2 className={`text-2xl font-black text-slate-800 capitalize tracking-tight ${isDesktop ? 'block' : 'hidden sm:block'}`}>{view.replace('-', ' ')}</h2>
          </div>

          <div className="flex items-center gap-6 flex-1 justify-end">
            <div className="relative max-w-md w-full" ref={searchRef}>
              <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearchFocused ? 'text-blue-600' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Global search (Tag, Status, Herd)..."
                className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-[1.5rem] text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-600/20 focus:bg-white transition-all shadow-sm"
                value={searchTerm}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {/* Quick Search Dropdown */}
              {isSearchFocused && searchTerm.length > 0 && (
                <div className="absolute top-full mt-3 left-0 right-0 bg-white border border-slate-100 rounded-[2rem] shadow-2xl p-4 animate-in slide-in-from-top-2 duration-300 max-h-[400px] overflow-y-auto">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3">Quick Results ({filteredAnimals.length})</p>
                  <div className="space-y-2">
                    {filteredAnimals.length > 0 ? filteredAnimals.map(a => (
                      <button
                        key={a.id}
                        onClick={() => { setSelectedAnimal(a); setIsSearchFocused(false); }}
                        className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${getStatusColor(a.status)}`}>
                            {a.tag.slice(-2)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 group-hover:text-blue-600">{a.tag}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">{a.breed} • {a.herd}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${getStatusColor(a.status)}`}>{a.status}</span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </div>
                      </button>
                    )) : (
                      <p className="text-center py-6 text-sm text-slate-400 font-bold italic">No matches found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setIsAlertPanelOpen(true)} className="relative p-3.5 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all group">
              <Bell className="w-6 h-6 group-hover:scale-110 transition-transform" />
              {alerts.length > 0 && <span className="absolute top-3 right-3 w-3 h-3 bg-rose-500 rounded-full border-[3px] border-white shadow-sm shadow-rose-200 animate-pulse"></span>}
            </button>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto p-4 md:p-10 scroll-smooth ${isDesktop ? 'pb-10' : 'pb-32'}`}>
          {view === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
              {/* Dashboard Hero Command & Quick Actions */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[3.5rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl">
                {/* Glowing design accents */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -translate-y-12 translate-x-12 pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 rounded-full border border-indigo-400/20 backdrop-blur-sm">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">System Ready & Synchronized</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-none text-white">
                      Farm Operations Command
                    </h2>
                    <p className="text-xs text-slate-300 font-bold max-w-xl leading-relaxed">
                      Real-time metrics, reproductive diagnostics tracking, and automated synchronization scheduling for your herd.
                    </p>
                  </div>

                  {/* Ribbon Quick Actions */}
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => setIsAnimalFormOpen(true)}
                      className="flex items-center gap-3 px-6 py-4 bg-white text-slate-900 hover:bg-slate-50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-white/5 group"
                    >
                      <div className="p-2 bg-slate-100 text-slate-800 rounded-xl group-hover:scale-110 transition-transform">
                        <Plus className="w-4 h-4" />
                      </div>
                      <span>Add Animal</span>
                    </button>

                    <button
                      onClick={() => setIsReproFormOpen(true)}
                      className="flex items-center gap-3 px-6 py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 group"
                    >
                      <div className="p-2 bg-indigo-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                      <span>Log Repro</span>
                    </button>

                    <button
                      onClick={() => setIsHealthFormOpen(true)}
                      className="flex items-center gap-3 px-6 py-4 bg-rose-600 text-white hover:bg-rose-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-rose-600/20 group"
                    >
                      <div className="p-2 bg-rose-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <span>Clinical Entry</span>
                    </button>

                    <button
                      onClick={() => setIsNewPdFormOpen(true)}
                      className="flex items-center gap-3 px-6 py-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 group"
                    >
                      <div className="p-2 bg-emerald-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span>Preg Exam</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dashboard Filters */}
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Advanced Filters</span>
                </div>
                <select 
                  className="bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  value={dashboardFilter.dateRange}
                  onChange={(e) => setDashboardFilter({ ...dashboardFilter, dateRange: e.target.value })}
                >
                  <option value="All">All Time</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
                <select 
                  className="bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  value={dashboardFilter.breed}
                  onChange={(e) => setDashboardFilter({ ...dashboardFilter, breed: e.target.value })}
                >
                  <option value="All">All Breeds</option>
                  {Array.from(new Set(animals.map(a => a.breed))).map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select 
                  className="bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  value={dashboardFilter.category}
                  onChange={(e) => setDashboardFilter({ ...dashboardFilter, category: e.target.value })}
                >
                  <option value="All">All Categories</option>
                  <option value="Adult">Adult Cows</option>
                  <option value="Calf">Calves Only</option>
                </select>
                <div className="ml-auto flex items-center gap-3">
                  <button
                    onClick={() => {
                      const label = 'Farm Dashboard Report';
                      const items = [
                        { tag: 'Conception Rate', value: `${dashboardStats.conceptionRate}%` },
                        { tag: 'Total Females', value: `${dashboardStats.totalFemales}` },
                        { tag: 'Pregnant', value: `${dashboardStats.pregnant}` },
                        { tag: 'Open (Ready)', value: `${dashboardStats.open}` },
                        { tag: 'Due for Heat', value: `${dashboardStats.heatDue}` },
                        { tag: 'Due for Calving', value: `${dashboardStats.calvingDue}` },
                        { tag: 'Sick Animals', value: `${dashboardStats.sick}` },
                        { tag: 'Under Observation', value: `${dashboardStats.underObservation}` }
                      ];
                      const text = generateListShareText(label, items);
                      shareToWhatsApp(text);
                    }}
                    className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" /> Share Dashboard
                  </button>
                  <button 
                    onClick={() => generateDashboardPDF(dashboardStats, animals, settings)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    <Download className="w-4 h-4" /> Export Analytics
                  </button>
                </div>
              </div>

              {/* 1. Reproduction Summary */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl">
                      <CalendarRange className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Reproduction Summary</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  <StatCard title="Pregnant" value={dashboardStats.pregnant} icon={Baby} colorClass="bg-emerald-500" trend={`${Math.round((dashboardStats.pregnant / (dashboardStats.total || 1)) * 100)}% Herd`} onClick={() => handleMetricClick('Pregnant')} />
                  <StatCard title="Open Animals" value={dashboardStats.open} icon={Square} colorClass="bg-blue-500" trend="Awaiting Insem" onClick={() => handleMetricClick('Open')} />
                  <StatCard title="Repeat Breeders" value={dashboardStats.repeatBreeders} icon={RotateCcw} colorClass="bg-rose-500" trend="> 3 Insems" onClick={() => handleMetricClick('Repeat Breeders')} />
                  <StatCard title="Animals in Heat" value={dashboardStats.inHeat} icon={Zap} colorClass="bg-amber-500" trend="Active Cycle" onClick={() => handleMetricClick('Heat')} />
                  <StatCard title="Heat Due" value={dashboardStats.heatDue} icon={Clock} colorClass="bg-blue-400" trend="Next Check" onClick={() => handleMetricClick('Heat Due')} />
                </div>
              </section>

              {/* FEATURE 4: Date Badges (Sticky Notes) */}
              {dateBadges.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-600 rounded-xl shadow-md shadow-indigo-100">
                        <CalendarIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Recent Pregnancy Checks by Date</h3>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Click a sticky badge to see all animal checks recorded on that date</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-slate-200">
                    {dateBadges.map((badge) => (
                      <div
                        key={badge.date}
                        onClick={() => setSelectedBadgeDate(badge.date)}
                        className={`flex-shrink-0 snap-start cursor-pointer group relative w-48 h-48 rounded-[2rem] border p-6 flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:rotate-1 ${badge.bg}`}
                      >
                        {/* Decorative tape / accent on sticky note */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 w-12 h-4 bg-white/40 backdrop-blur-sm rounded-b-md border border-white/20 shadow-[0_2px_4px_rgba(0,0,0,0.02)]" />
                        
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-white/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/40">
                            {badge.badgeNum}
                          </span>
                          <span className="text-2xl filter drop-shadow-sm group-hover:scale-125 transition-transform duration-300">{badge.icon}</span>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Check Date</p>
                          <p className="text-base font-black tracking-tight leading-tight group-hover:text-blue-700 transition-colors">
                            {formatDateReadable(badge.date)}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-slate-500/10">
                          <span className="text-[10px] font-bold">Checks: {badge.checks.length}</span>
                          <div className="flex items-center gap-2 text-[10px] font-black">
                            <span className="text-emerald-700">🤰 {badge.checks.filter(e => e.pregnancyResult === 'Pregnant').length}</span>
                            <span className="text-rose-700">❌ {badge.checks.filter(e => e.pregnancyResult !== 'Pregnant').length}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 2. Fertility Performance */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Efficiency Analysis</h3>
                      <p className="text-3xl font-black text-slate-800 tracking-tight">
                        {dashboardChartType === 'repro' && 'Reproduction Trends'}
                        {dashboardChartType === 'health' && 'Clinical Discovery Trends'}
                        {dashboardChartType === 'conception' && 'Conception Success Rate'}
                      </p>
                    </div>
                    {/* Modern Chart Type Switcher */}
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner self-start sm:self-auto">
                      <button
                        onClick={() => setDashboardChartType('repro')}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          dashboardChartType === 'repro'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Reproduction
                      </button>
                      <button
                        onClick={() => setDashboardChartType('health')}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          dashboardChartType === 'health'
                            ? 'bg-white text-rose-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Health
                      </button>
                      <button
                        onClick={() => setDashboardChartType('conception')}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          dashboardChartType === 'conception'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Conception
                      </button>
                    </div>
                  </div>

                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {dashboardChartType === 'repro' ? (
                        <BarChart data={reproductionTrends}>
                          <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 800 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                          <Tooltip
                            cursor={{ fill: '#F8FAFC' }}
                            contentStyle={{ borderRadius: '24px', border: 'none', padding: '16px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }}
                          />
                          <Bar dataKey="inseminations" name="Inseminations" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="pregnancies" name="Pregnancies" fill="#10B981" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="calvings" name="Calvings" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      ) : dashboardChartType === 'health' ? (
                        <BarChart data={healthTrends}>
                          <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 800 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} />
                          <Tooltip
                            cursor={{ fill: '#F8FAFC' }}
                            contentStyle={{ borderRadius: '24px', border: 'none', padding: '16px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }}
                          />
                          <Bar dataKey="treatments" name="Treatments" fill="#EC4899" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="cases" name="Clinical Cases" fill="#F43F5E" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      ) : (
                        <BarChart data={conceptionRateTrends}>
                          <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 800 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} unit="%" />
                          <Tooltip
                            cursor={{ fill: '#F8FAFC' }}
                            contentStyle={{ borderRadius: '24px', border: 'none', padding: '16px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }}
                          />
                          <Bar dataKey="rate" name="Success Rate" fill="#6366F1" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                  {/* Top Stats */}
                  <div className="text-center pb-6 border-b border-slate-100">
                    <div className="p-5 rounded-[2rem] bg-blue-50 border border-blue-100 mb-4 mx-auto w-fit">
                      <Target className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Reproductive Performance</h3>
                    <p className="text-4xl font-black text-slate-800 leading-none">{dashboardStats.conceptionRate}%</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Overall Conception Rate</p>
                    <div className="mt-4 max-w-[160px] mx-auto">
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${dashboardStats.conceptionRate}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Donut Chart Portion */}
                  <div className="pt-6 flex-1 flex flex-col justify-center items-center">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Herd Status Proportions</h4>
                    <div className="relative w-full h-[140px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={60}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-lg font-black text-slate-800 leading-none">
                          {statusDistribution.reduce((acc, curr) => acc + curr.value, 0)}
                        </span>
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Cows</span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="flex flex-wrap gap-2 justify-center mt-3 max-w-xs">
                      {statusDistribution.map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight">
                            {entry.name} ({entry.value})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Health Summary */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-600 rounded-xl">
                      <HeartPulse className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Health Summary</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <StatCard title="Sick Animals" value={dashboardStats.sick} icon={Stethoscope} colorClass="bg-rose-500" trend="Active Cases" onClick={() => handleMetricClick('Sick')} />
                    <StatCard title="Recently Treated" value={dashboardStats.recentlyTreated} icon={Activity} colorClass="bg-amber-500" trend="Last 7 Days" onClick={() => handleMetricClick('Treated')} />
                    <StatCard title="In Lab / Support" value={dashboardStats.inProtocol} icon={FlaskConical} colorClass="bg-blue-500" trend="Under Protocol" onClick={() => handleMetricClick('Protocol')} />
                    <StatCard title="Under Observation" value={dashboardStats.underObservation} icon={Eye} colorClass="bg-slate-400" trend="Monitoring" onClick={() => handleMetricClick('Observation')} />
                  </div>
                  <div className="lg:col-span-7 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8 px-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disease Frequency</h4>
                      <BarChart3 className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="space-y-5">
                      {diseaseFrequency.length > 0 ? diseaseFrequency.map((disease, i) => (
                        <div key={i} className="flex items-center gap-6">
                          <span className="text-[10px] font-black text-slate-300 w-4">0{i+1}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black text-slate-700">{disease.name}</span>
                              <span className="text-xs font-black text-slate-400">{disease.value} cases</span>
                            </div>
                            <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500" style={{ width: `${(disease.value / (healthEvents.length || 1)) * 100}%` }}></div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="py-10 text-center opacity-30 italic text-sm">No health cases logged recently</div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. Calving & Dry Summary */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <div className="p-2 bg-emerald-600 rounded-xl">
                    <BabyIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Calving & Dry Management</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Dry Animals" value={dashboardStats.dry} icon={Droplets} colorClass="bg-slate-500" trend="Rest Period" onClick={() => handleMetricClick('Dry')} />
                  <StatCard title="Calving Due" value={dashboardStats.calvingDue} icon={Clock} colorClass="bg-emerald-500" trend="Next 7 Days" onClick={() => handleMetricClick('Calving Due')} />
                  <StatCard title="Overdue Calving" value={dashboardStats.overdueCalving} icon={AlertTriangle} colorClass="bg-rose-500" trend="Urgent Action" onClick={() => handleMetricClick('Overdue')} />
                  <StatCard title="Calf Population" value={dashboardStats.calves} icon={BabyIcon} colorClass="bg-amber-500" trend="Health Support" onClick={() => { setView('animals'); setHerdTab('calves'); }} />
                </div>
              </section>

              {/* 5 & 6. Activities & Alerts */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Upcoming Alerts Section */}
                <div className="lg:col-span-5 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <Bell className="w-5 h-5 text-amber-500" /> Upcoming Alerts
                    </h3>
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black border border-amber-100">{alerts.length} Tasks</span>
                  </div>
                  <div className="space-y-5 flex-1 overflow-y-auto max-h-[500px] pr-2 scrollbar-hide">
                    {alerts.length > 0 ? alerts.map(alert => (
                      <div 
                        key={alert.id} 
                        className="group flex items-start gap-4 p-5 rounded-[1.5rem] bg-slate-50/50 hover:bg-white transition-all border border-transparent hover:border-slate-100 hover:shadow-lg cursor-pointer"
                        onClick={() => {
                          const animal = animals.find(a => a.id === alert.animalId);
                          if (animal) setSelectedAnimal(animal);
                        }}
                      >
                        <div className={`mt-0.5 p-3 rounded-2xl shadow-sm ${alert.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate leading-tight mb-1">{alert.title}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1 leading-relaxed font-bold mb-3 uppercase tracking-wider">{alert.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-100 shadow-sm">
                              <CalendarIcon className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{alert.dueDate}</span>
                            </div>
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${alert.priority === 'High' ? 'text-rose-600' : 'text-blue-500'}`}>{alert.priority}</span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center h-full py-10 opacity-40">
                        <CheckCircle2 className="w-16 h-16 text-slate-200 mb-4" />
                        <p className="text-xs text-slate-400 font-black tracking-widest uppercase">No pending alerts</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activities Section */}
                <div className="lg:col-span-7 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 rounded-2xl">
                        <History className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Recent Activities</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latest farm updates</p>
                      </div>
                    </div>
                    <button onClick={() => setView('reports')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline px-4 py-2 bg-blue-50 rounded-xl">View All Log</button>
                  </div>
                  <div className="space-y-4">
                    {recentAnalyticsActivities.map((log: any, index: number) => {
                      const animal = animals.find(a => a.id === log.animalId);
                      return (
                        <div key={`${log.id}-${index}`} className="flex items-center gap-5 p-5 rounded-[1.5rem] bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 transition-all cursor-pointer group" onClick={() => setSelectedAnimal(animal || null)}>
                          <div className={`p-4 rounded-xl shadow-sm ${log.logType === 'Repro' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                            {log.logType === 'Repro' ? <Baby className="w-5 h-5" /> : <Stethoscope className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors uppercase">{animal?.tag || 'Unknown'}</span>
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${log.logType === 'Repro' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                                {log.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-bold truncate pr-4">{log.details}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{log.date}</p>
                            <div className="flex items-center justify-end gap-1">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                              <span className="text-[9px] text-emerald-600 font-black uppercase">Confirmed</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          )}

          {view === 'animals' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-10">
              <div className="bg-white p-6 md:p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-center">
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search tags or status..."
                        className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <select
                      className="w-full sm:w-auto bg-slate-50 border-none rounded-2xl text-sm font-black py-3.5 px-6 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Status</option>
                      {Object.values(AnimalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="flex p-1 bg-slate-100 rounded-2xl shadow-inner flex-1 sm:flex-none">
                      {[
                        { id: 'list', icon: LayoutList },
                        { id: 'small', icon: LayoutGrid },
                        { id: 'medium', icon: Grid2X2 },
                        { id: 'large', icon: Square },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setHerdViewMode(mode.id as HerdViewMode)}
                          className={`p-3 rounded-xl transition-all ${herdViewMode === mode.id
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                          title={`${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)} View`}
                        >
                          <mode.icon className="w-5 h-5" />
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        const label = statusFilter === 'All' ? 'All Status' : statusFilter;
                        generateAnimalListReport(filteredAnimals, settings, label);
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-white text-slate-700 border-2 border-slate-100 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all border-slate-200"
                    >
                      <Download className="w-6 h-6" /> Export PDF
                    </button>

                    <button
                      onClick={() => {
                        const label = (statusFilter === 'All' ? 'Livestock' : statusFilter) + ' List';
                        const items = filteredAnimals.map(a => ({ tag: a.tag, value: a.status || 'Active' }));
                        const text = generateListShareText(label, items);
                        shareToWhatsApp(text);
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-emerald-50 text-emerald-700 border-2 border-emerald-100 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-100 transition-all"
                    >
                      <MessageCircle className="w-6 h-6" /> Share List
                    </button>

                    <button
                      onClick={() => { setEditingAnimalId(null); setNewAnimal({ sex: 'Female', breed: 'Holstein', herd: 'Main Herd' }); setIsAnimalFormOpen(true); }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                    >
                      <Plus className="w-6 h-6" /> Add Cow
                    </button>
                  </div>
                </div>
              </div>

              {/* Adults / Calves Tab Switcher */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit shadow-inner">
                <button
                  onClick={() => setHerdTab('adults')}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${herdTab === 'adults' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  Adults ({adultAnimals.length})
                </button>
                <button
                  onClick={() => setHerdTab('calves')}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${herdTab === 'calves' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  🐄 Calves ({calfAnimals.length})
                </button>
              </div>

              {herdTab === 'calves' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {calfAnimals.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                      <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No calves recorded yet</p>
                      <p className="text-slate-300 text-xs mt-2">Calves are auto-added when a Calving event is recorded</p>
                    </div>
                  ) : calfAnimals.map((calf, index) => {
                    const mother = animals.find(a => a.id === calf.motherId);
                    return (
                      <div key={calf.id} className="bg-white p-8 rounded-[3rem] border-2 border-emerald-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-emerald-400" />
                        <div className="absolute top-6 right-8 text-[10px] font-black text-slate-300">#{index + 1}</div>
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 font-black text-xl border border-emerald-100">
                              {calf.tag.slice(-2)}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-800 text-xl tracking-tighter">{calf.tag}</h4>
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-100">{calf.sex} Calf</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mother</span>
                            <span className="text-xs font-black text-slate-700">{mother?.tag || calf.motherId || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Father (Bull)</span>
                            <span className="text-xs font-black text-slate-700">{calf.fatherId || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Born</span>
                            <span className="text-xs font-black text-slate-700">{calf.dob}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`
                ${herdViewMode === 'list' ? 'flex flex-col gap-3' : ''}
                ${herdViewMode === 'small' ? 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4' : ''}
                ${herdViewMode === 'medium' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : ''}
                ${herdViewMode === 'large' ? 'grid grid-cols-1 lg:grid-cols-2 gap-8' : ''}
              `}>
                  {adultAnimals.map((animal, index) => {
                    const EditButton = () => (
                      <button
                        onClick={(e) => handleEditAnimal(animal, e)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    );

                    if (herdViewMode === 'list') {
                      return (
                        <div
                          key={animal.id}
                          onClick={() => setSelectedAnimal(animal)}
                          className="group bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-slate-300 w-2">#{index + 1}</span>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${getStatusColor(animal.status)}`}>
                              {animal.tag.slice(-2)}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 group-hover:text-blue-600">{animal.tag}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{animal.breed} • {animal.herd}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-8">
                            {(animal.pregnancyDays !== undefined && animal.pregnancyDays > 0) && (
                              <div className="hidden lg:flex flex-col items-end">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pregnancy</span>
                                <span className="text-xs font-black text-blue-600">{animal.pregnancyDays} Days</span>
                              </div>
                            )}
                            {animal.expectedCalving && (
                              <div className="hidden xl:flex flex-col items-end">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Exp. Calving</span>
                                <span className="text-xs font-black text-emerald-600">{animal.expectedCalving}</span>
                              </div>
                            )}
                            <span className={`hidden sm:inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${getStatusColor(animal.status)}`}>
                              {animal.status}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const text = generateAnimalShareText(animal, reproEvents, healthEvents);
                                  shareToWhatsApp(text);
                                }}
                                className="p-2 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-all"
                                title="Share on WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <EditButton />
                              <button onClick={(e) => handleDeleteAnimal(animal, e)} className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (herdViewMode === 'small') {
                      return (
                        <div
                          key={animal.id}
                          onClick={() => setSelectedAnimal(animal)}
                          className="group bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-center cursor-pointer relative"
                        >
                          <div className="absolute top-2 left-2 text-[8px] font-black text-slate-300 bg-slate-50 px-1 rounded">#{index + 1}</div>
                          <div className={`w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center font-black text-xs ${getStatusColor(animal.status)}`}>
                            {animal.tag.slice(-2)}
                          </div>
                          <p className="font-black text-slate-800 text-sm truncate">{animal.tag}</p>
                          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(animal.status).split(' ')[0]}`}></div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <EditButton />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (herdViewMode === 'large') {
                      return (
                        <div
                          key={animal.id}
                          onClick={() => setSelectedAnimal(animal)}
                          className="group bg-white p-10 rounded-[3.5rem] border-2 border-slate-50 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all duration-500 cursor-pointer relative"
                        >
                          <div className="absolute top-8 left-8 text-xs font-black text-slate-200">SR NO. {index + 1}</div>
                          <div className="flex items-start justify-between mb-8 mt-4">
                            <div className="flex items-center gap-8">
                              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border border-slate-100 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-500 shadow-inner">
                                <Tag className="w-10 h-10 text-slate-300 group-hover:text-white transition-colors" />
                              </div>
                              <div>
                                <h4 className="font-black text-slate-800 text-4xl group-hover:text-blue-600 transition-colors tracking-tighter mb-2">{animal.tag}</h4>
                                <div className="flex items-center gap-3">
                                  <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusColor(animal.status)}`}>
                                    {animal.status}
                                  </span>
                                  <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{animal.breed}</p>
                                </div>
                              </div>
                            </div>
                            <EditButton />
                          </div>
                          <div className="grid grid-cols-2 gap-6 mt-10">
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100/50">
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">Age Context</p>
                              <p className="text-xl font-black text-slate-800">{dateUtils.diffDays(new Date().toISOString().split('T')[0], animal.dob)} Days Old</p>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100/50">
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">Assigned Herd</p>
                              <p className="text-xl font-black text-slate-700 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-500" /> {animal.herd}</p>
                            </div>
                          </div>
                          {(animal.pregnancyDays !== undefined || animal.expectedCalving) && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              {animal.pregnancyDays !== undefined && animal.pregnancyDays > 0 && (
                                <div className="p-4 bg-blue-50 rounded-[2rem] border border-blue-100/50">
                                  <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em] mb-2">Pregnancy</p>
                                  <p className="text-xl font-black text-blue-800">{animal.pregnancyDays} Days</p>
                                </div>
                              )}
                              {animal.expectedCalving && (
                                <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100/50">
                                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em] mb-2">Exp. Calving</p>
                                  <p className="text-xl font-black text-emerald-800">{animal.expectedCalving}</p>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="absolute bottom-8 right-8 bg-blue-50 p-4 rounded-3xl text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                            <ArrowRight className="w-6 h-6" />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={animal.id}
                        onClick={() => setSelectedAnimal(animal)}
                        className="group bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer relative overflow-hidden"
                      >
                        <div className="absolute top-6 left-8 text-[10px] font-black text-slate-200">#{index + 1}</div>
                        <div className="flex items-start justify-between mb-6 mt-2">
                          <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center border border-slate-100 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-500 shadow-inner">
                              <Tag className="w-7 h-7 text-slate-400 group-hover:text-white transition-colors" />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-800 text-2xl group-hover:text-blue-600 transition-colors tracking-tighter">{animal.tag}</h4>
                              <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{animal.breed}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tighter border shadow-sm ${getStatusColor(animal.status)}`}>
                              {animal.status}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const text = generateAnimalShareText(animal, reproEvents, healthEvents);
                                  shareToWhatsApp(text);
                                }}
                                className="p-2 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-all opacity-0 group-hover:opacity-100"
                                title="Share on WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <EditButton />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-8">
                          <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100/50">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Born</p>
                            <p className="text-sm font-black text-slate-700">{animal.dob}</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100/50">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Herd Location</p>
                            <p className="text-sm font-black text-slate-700 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {animal.herd}</p>
                          </div>
                        </div>
                        {(animal.pregnancyDays !== undefined || animal.expectedCalving) && (
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            {animal.pregnancyDays !== undefined && animal.pregnancyDays > 0 && (
                              <div className="p-4 bg-blue-50 rounded-[1.5rem] border border-blue-100/50">
                                <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em] mb-1">Pregnancy</p>
                                <p className="text-sm font-black text-blue-700">{animal.pregnancyDays} Days</p>
                              </div>
                            )}
                            {animal.expectedCalving && (
                              <div className="p-4 bg-emerald-50 rounded-[1.5rem] border border-emerald-100/50">
                                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em] mb-1">Expected Calving</p>
                                <p className="text-sm font-black text-emerald-700">{animal.expectedCalving}</p>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                          <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-xl shadow-blue-200">
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {view === 'repro' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div className="flex flex-col sm:flex-row gap-6 justify-between items-center bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Reproduction Lab</h3>
                  <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Global fertility logs</p>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      const label = (reproDateStart || reproDateEnd) ? `${reproDateStart || 'Start'} to ${reproDateEnd || 'End'}` : 'Full History';
                      generateReproSectionReport(filteredReproEvents, animals, settings, reproEvents, label);
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-white text-slate-700 border-2 border-slate-100 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all border-slate-200"
                  >
                    <Printer className="w-5 h-5" /> Print PDF
                  </button>
                  <button
                    onClick={() => {
                      const label = (reproDateStart || reproDateEnd) ? `${reproDateStart || 'Start'} to ${reproDateEnd || 'End'}` : 'Reproduction History';
                      const items = filteredReproEvents.map(e => {
                        const animal = animals.find(a => a.id === e.animalId);
                        return { tag: animal?.tag || 'Unk', value: `${e.type} on ${e.date}` };
                      });
                      const text = generateListShareText(label, items);
                      shareToWhatsApp(text);
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-emerald-50 text-emerald-700 border-2 border-emerald-100 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all"
                  >
                    <MessageCircle className="w-5 h-5" /> Share List
                  </button>
                  <button
                    onClick={() => { setEditingReproId(null); setNewRepro({ type: ReproEventType.ESTRUS, date: new Date().toISOString().split('T')[0] }); setIsReproFormOpen(true); }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                  >
                    <Plus className="w-5 h-5" /> Record Event
                  </button>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Filters & Sorters</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Animal Tag</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search tag..."
                        className="w-full pl-9 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={reproTagSearch}
                        onChange={(e) => setReproTagSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Technician</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={reproTechFilter}
                      onChange={(e) => setReproTechFilter(e.target.value)}
                    >
                      <option value="All">All Technicians</option>
                      {uniqueReproTechs.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Semen / Bull</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={reproSemenFilter}
                      onChange={(e) => setReproSemenFilter(e.target.value)}
                    >
                      <option value="All">All Semen</option>
                      {uniqueSemens.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From Date</label>
                      <button onClick={() => { const today = new Date().toISOString().split('T')[0]; setReproDateStart(today); setReproDateEnd(today); }} className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest">Today</button>
                    </div>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={reproDateStart}
                      onChange={(e) => setReproDateStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">To Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={reproDateEnd}
                      onChange={(e) => setReproDateEnd(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sort By</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={reproSort}
                      onChange={(e) => setReproSort(e.target.value as any)}
                    >
                      <option value="Date Desc">Newest First</option>
                      <option value="Date Asc">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pregnancy Check Queue in Reproduction View */}
              {inseminatedAnimals.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-[2.5rem] p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-blue-800 uppercase tracking-widest">Pregnancy Check Queue</h4>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{inseminatedAnimals.length} animals awaiting clearance</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inseminatedAnimals.map(a => {
                      const lastInsem = reproEvents.filter(e => e.animalId === a.id && e.type === ReproEventType.INSEMINATION).sort((x, y) => y.date.localeCompare(x.date))[0];
                      const daysSince = lastInsem ? dateUtils.diffDays(new Date().toISOString().split('T')[0], lastInsem.date) : 0;
                      // Show all inseminated animals in the queue
                      const isCheckDue = daysSince >= settings.pregnancyCheckDays - 3;
                      const isOverdue = daysSince >= settings.pregnancyCheckDays;
                      return (
                        <div key={a.id} className={`bg-white rounded-2xl p-5 border-2 flex items-center justify-between shadow-sm transition-all hover:shadow-md ${isOverdue ? 'border-rose-300 shadow-rose-50' : isCheckDue ? 'border-amber-300 shadow-amber-50' : 'border-blue-100'
                          }`}>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-black text-slate-800 text-lg">{a.tag}</p>
                              {isOverdue && <span className="text-[9px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase tracking-tight">Overdue</span>}
                              {!isOverdue && isCheckDue && <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase tracking-tight">Due Soon</span>}
                            </div>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${isOverdue ? 'text-rose-600' : isCheckDue ? 'text-amber-600' : 'text-blue-500'
                              }`}>Day {daysSince} / {settings.pregnancyCheckDays} since insem</p>
                            {lastInsem && <p className="text-[9px] text-slate-400 font-bold mt-1">Inseminated: {lastInsem.date}</p>}
                          </div>
                          <button
                            onClick={() => { setPregnancyCheckTarget(a); setPregnancyCheckResult(''); setIsPregnancyCheckModalOpen(true); }}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md ml-3"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Check
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest w-16 text-center">Sr. No</th>
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Tag</th>
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Tech</th>
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Semen</th>
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Result</th>
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Last PD Date</th>
                      <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredReproEvents.filter(e => e.type !== ReproEventType.PREGNANCY_CHECK).map((event, index) => {
                      const animal = animals.find(a => a.id === event.animalId);
                      const lastPdDate = reproEvents
                        .filter(ev => ev.animalId === event.animalId && ev.type === ReproEventType.PREGNANCY_CHECK)
                        .sort((a, b) => b.date.localeCompare(a.date))[0]?.date || 'Not Done';

                      return (
                        <tr key={event.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                          <td className="px-8 py-6 text-xs font-black text-slate-400 text-center">{index + 1}</td>
                          <td className="px-8 py-6" onClick={() => setSelectedAnimal(animal || null)}>
                            <span className="text-sm text-slate-700 font-bold">{event.date}</span>
                          </td>
                          <td className="px-8 py-6" onClick={() => setSelectedAnimal(animal || null)}>
                            <span className="font-black text-slate-800 group-hover:text-blue-600">{animal?.tag || 'Unk'}</span>
                          </td>
                          <td className="px-8 py-6" onClick={() => setSelectedAnimal(animal || null)}>
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm border inline-block w-fit ${event.type === ReproEventType.INSEMINATION ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              event.type === ReproEventType.PREGNANCY_CHECK ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                event.type === ReproEventType.ABORTION ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                  'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                              {event.type}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-sm text-slate-700 font-bold">{event.technician ? dateUtils.normalizeName(event.technician) : '--'}</td>
                          <td className="px-8 py-6 text-sm text-slate-500 font-black">{event.semenName ? dateUtils.normalizeName(event.semenName) : (event.bullId ? dateUtils.normalizeName(event.bullId) : '--')}</td>
                          <td className="px-8 py-6">
                            {event.type === ReproEventType.PREGNANCY_CHECK ? (
                              <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${event.success ? 'text-emerald-600' : 'text-rose-500'}`}>
                                <div className={`w-2 h-2 rounded-full ${event.success ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                {event.success ? '+ve' : '-ve'}
                              </span>
                            ) : event.type === ReproEventType.INSEMINATION ? (() => {
                              // Find the earliest pregnancy check occurring AFTER this insemination
                              const checks = reproEvents
                                .filter(ev => ev.animalId === event.animalId && ev.type === ReproEventType.PREGNANCY_CHECK && ev.date >= event.date)
                                .sort((a, b) => a.date.localeCompare(b.date));
                              const subsequentCheck = checks[0];
                              const res = subsequentCheck ? (subsequentCheck.success ? '+ve' : '-ve') : 'Pending';
                              const color = res === '+ve' ? 'text-emerald-600' : (res === '-ve' ? 'text-rose-500' : 'text-amber-500');
                              const bgColor = res === '+ve' ? 'bg-emerald-500' : (res === '-ve' ? 'bg-rose-500' : 'bg-amber-500');
                              return (
                                <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${color}`}>
                                  <div className={`w-2 h-2 rounded-full ${bgColor}`}></div>
                                  {res}
                                </span>
                              );
                            })() : (
                              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                Done
                              </span>
                            )}
                          </td>
                          <td className="px-8 py-6">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${lastPdDate === 'Not Done' ? 'text-slate-300' : 'text-blue-600'}`}>
                              {lastPdDate}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const text = generateReproEventShareText(event, animal?.tag || 'Unknown');
                                  shareToWhatsApp(text);
                                }}
                                className="p-3 bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-all"
                                title="Share on WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleEditRepro(event, e)}
                                className="p-3 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"
                                title="Edit Details"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteRepro(event, e)}
                                className="p-3 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'health' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              {/* Top Banner for Low Stock Alerts (Popups) */}
              {lowStockAlerts.length > 0 && (
                <div className="bg-rose-50 border-2 border-rose-200 rounded-[2rem] p-6 space-y-4 shadow-lg shadow-rose-100 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-rose-600 animate-pulse" />
                      <div>
                        <h4 className="text-sm font-black text-rose-900 uppercase tracking-wider">⚠️ Medicine Inventory Warning Alerts</h4>
                        <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">Action Required: Several item stocks are below safe levels</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setLowStockAlerts([])}
                      className="text-xs font-black text-rose-600 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all"
                    >
                      Clear Alerts
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {lowStockAlerts.map(alert => (
                      <div key={alert.id} className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-rose-100 text-xs text-rose-700 font-bold leading-relaxed">
                        <span>•</span>
                        <span>{alert.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Health Bay Sub-navigation Menu */}
              <div className="flex flex-col sm:flex-row gap-6 justify-between items-center bg-white p-6 sm:p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Health Bay</h3>
                  <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Smart Veterinary, Treatment, & Medicine Suite</p>
                </div>

                <div className="flex border border-slate-100 bg-slate-50 p-1.5 rounded-2xl flex-wrap gap-1 shadow-inner">
                  <button
                    onClick={() => setHealthSubTab('treatments')}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      healthSubTab === 'treatments'
                        ? 'bg-white text-rose-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Syringe className="w-3.5 h-3.5" /> Treatments
                  </button>
                  <button
                    onClick={() => setHealthSubTab('inventory')}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      healthSubTab === 'inventory'
                        ? 'bg-white text-rose-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" /> Medicine Inventory
                  </button>
                  <button
                    onClick={() => setHealthSubTab('reports')}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      healthSubTab === 'reports'
                        ? 'bg-white text-rose-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" /> Reports & Forecasts
                  </button>
                </div>
              </div>

              {/* SUB-TAB 1: TREATMENTS & CLINICAL LOG */}
              {healthSubTab === 'treatments' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-end gap-3 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                    <button
                      onClick={() => {
                        const label = (healthDateStart || healthDateEnd) ? `${healthDateStart || 'Start'} to ${healthDateEnd || 'End'}` : 'Full History';
                        generateHealthSectionReport(filteredHealthEvents, animals, settings, label);
                      }}
                      className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                      <Printer className="w-4 h-4" /> Print PDF
                    </button>
                    <button
                      onClick={() => {
                        const label = (healthDateStart || healthDateEnd) ? `${healthDateStart || 'Start'} to ${healthDateEnd || 'End'}` : 'Clinical History';
                        const items = filteredHealthEvents.map(e => {
                          const animal = animals.find(a => a.id === e.animalId);
                          return { tag: animal?.tag || 'Unk', value: `${e.type} - ${e.details || 'Checkup'}` };
                        });
                        const text = generateListShareText(label, items);
                        shareToWhatsApp(text);
                      }}
                      className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all"
                    >
                      <MessageCircle className="w-4 h-4" /> Share List
                    </button>
                    <button
                      onClick={() => {
                        setEditingHealthId(null);
                        setNewHealth({
                          type: HealthEventType.ILLNESS,
                          date: new Date().toISOString().split('T')[0],
                          treatments: [{ name: '', dose: '' }]
                        });
                        setTreatmentAnimalType('single');
                        setHealthAnimalSearch('');
                        setSelectedMultipleAnimals([]);
                        setIsHealthFormOpen(true);
                      }}
                      className="flex items-center gap-2 bg-rose-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md shadow-rose-100"
                    >
                      <Plus className="w-4 h-4" /> Log Treatment
                    </button>
                  </div>

                  {/* Filters block */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Filter className="w-5 h-5 text-rose-600" />
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Treatment Filters</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Patient Tag</label>
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search tag..."
                            className="w-full pl-9 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                            value={healthTagSearch}
                            onChange={(e) => setHealthTagSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Technician / Vet</label>
                        <select
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                          value={healthTechFilter}
                          onChange={(e) => setHealthTechFilter(e.target.value)}
                        >
                          <option value="All">All Vets</option>
                          {uniqueHealthTechs.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Medication</label>
                        <select
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                          value={healthMedFilter}
                          onChange={(e) => setHealthMedFilter(e.target.value)}
                        >
                          <option value="All">All Medication</option>
                          {uniqueMedications.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Type</label>
                        <select
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                          value={healthTypeFilter}
                          onChange={(e) => setHealthTypeFilter(e.target.value)}
                        >
                          <option value="All">All Types</option>
                          {Object.values(HealthEventType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From Date</label>
                          <button onClick={() => { const today = new Date().toISOString().split('T')[0]; setHealthDateStart(today); setHealthDateEnd(today); }} className="text-[9px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-widest">Today</button>
                        </div>
                        <input
                          type="date"
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                          value={healthDateStart}
                          onChange={(e) => setHealthDateStart(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pregnancy check helper in treatments sub-view */}
                  {inseminatedAnimals.length > 0 && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-[2.5rem] p-8 space-y-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest">Pregnancy Check Queue — {inseminatedAnimals.length} Inseminated</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {inseminatedAnimals.map(a => {
                          const lastInsem = reproEvents.filter(e => e.animalId === a.id && e.type === ReproEventType.INSEMINATION).sort((x, y) => y.date.localeCompare(x.date))[0];
                          const daysSince = lastInsem ? dateUtils.diffDays(new Date().toISOString().split('T')[0], lastInsem.date) : 0;
                          const isCheckDue = daysSince >= settings.pregnancyCheckDays - 3;
                          return (
                            <div key={a.id} className={`bg-white rounded-2xl p-5 border flex items-center justify-between shadow-sm ${isCheckDue ? 'border-amber-200 shadow-amber-50/50' : 'border-blue-50'}`}>
                              <div>
                                <p className="font-black text-slate-800">{a.tag}</p>
                                <p className={`text-[10px] font-black uppercase tracking-wider ${isCheckDue ? 'text-amber-600' : 'text-blue-500'}`}>Day {daysSince} since insem</p>
                              </div>
                              <button
                                onClick={() => { setPregnancyCheckTarget(a); setPregnancyCheckResult(''); setIsPregnancyCheckModalOpen(true); }}
                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Preg Check
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Table Clinical Records List */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">Sr. No</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Animal</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Type</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prescription</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Condition Details</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredHealthEvents.map((event, index) => {
                            const animal = animals.find(a => a.id === event.animalId);
                            return (
                              <tr key={event.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-8 py-6 text-xs font-black text-slate-400 text-center">{index + 1}</td>
                                <td className="px-8 py-6 cursor-pointer" onClick={() => setSelectedAnimal(animal || null)}>
                                  <span className="font-black text-slate-800 group-hover:text-blue-600">{animal?.tag || 'Unknown Tag'}</span>
                                  <br />
                                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                    {animal?.status || 'Active'}
                                  </span>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="flex flex-col">
                                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm border inline-block w-fit ${event.type === HealthEventType.ILLNESS ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                                      }`}>
                                      {event.type}
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-bold mt-1.5 uppercase tracking-wider">
                                      {event.date}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  {(event.treatments && event.treatments.length > 0 && event.treatments[0].name) ? (
                                    <div className="space-y-1">
                                      {event.treatments.map((t, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                          <Syringe className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                          <span className="text-xs font-black text-slate-700">{t.name || 'Unnamed'}</span>
                                          <span className="text-[9px] font-black text-slate-400 uppercase ml-1">({t.dose || 'N/A'})</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : event.medication ? (
                                    <div className="flex items-center gap-2">
                                      <Syringe className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                      <span className="text-xs font-black text-slate-700">{event.medication}</span>
                                      <span className="text-[9px] font-black text-slate-400 uppercase ml-1">({event.dosage || 'N/A'})</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">No medication</span>
                                  )}
                                </td>
                                <td className="px-8 py-6 max-w-[200px]">
                                  <p className="text-xs text-slate-600 font-bold truncate" title={event.details}>{event.details || '--'}</p>
                                  {event.technician && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 block">Tech: {dateUtils.normalizeName(event.technician)}</span>}

                                  {event.treatmentDays && (() => {
                                    const today = new Date().toISOString().split('T')[0];
                                    const endDate = dateUtils.addDays(event.date, event.treatmentDays);
                                    const daysInto = dateUtils.diffDays(today, event.date);
                                    const daysLeft = dateUtils.diffDays(endDate, today);
                                    const isActive = daysInto >= 0 && daysLeft >= 0;
                                    return isActive ? (
                                      <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md mt-2 inline-block">
                                        {daysLeft} days active
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md mt-2 inline-block">
                                        Done
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        const text = generateHealthEventShareText(event, animal?.tag || 'Unknown');
                                        shareToWhatsApp(text);
                                      }}
                                      className="p-2 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                                      title="Share on WhatsApp"
                                    >
                                      <MessageCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingHealthId(event.id);
                                        const toEdit = { ...event };
                                        if (!toEdit.treatments) {
                                          if (toEdit.medication || toEdit.dosage) {
                                            toEdit.treatments = [{ name: toEdit.medication || '', dose: toEdit.dosage || '' }];
                                          } else {
                                            toEdit.treatments = [{ name: '', dose: '' }];
                                          }
                                        }
                                        setNewHealth(toEdit);
                                        setTreatmentAnimalType('single');
                                        const anim = animals.find((x: any) => x.id === event.animalId);
                                        if (anim) setHealthAnimalSearch(anim.tag);
                                        setIsHealthFormOpen(true);
                                      }}
                                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteHealth(event, e)}
                                      className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredHealthEvents.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-bold text-sm">
                                No health records found in this view.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: MEDICINE INVENTORY */}
              {healthSubTab === 'inventory' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Inventory controls header */}
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    {/* Search bar */}
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search medicines by name..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                        value={medInventorySearch}
                        onChange={e => setMedInventorySearch(e.target.value)}
                      />
                    </div>
                    
                    {/* Category Filter */}
                    <div className="w-full md:w-48">
                      <select
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                        value={medInventoryCat}
                        onChange={e => setMedInventoryCat(e.target.value)}
                      >
                        <option value="All">All Categories</option>
                        <option value="Injection">💉 Injection</option>
                        <option value="Liquid">🧴 Liquid</option>
                        <option value="Powder">💊 Powder</option>
                        <option value="Pill">💊 Pill</option>
                        <option value="Topical">🧴 Topical</option>
                        <option value="Other">📦 Other</option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        setEditingMedicineId(null);
                        setNewMedicine({ name: '', category: 'Injection', unit: 'ml', packs: 0, loose: 0, loosePerPack: 100, minStockLevel: 50 });
                        setIsMedicineFormOpen(true);
                      }}
                      className="w-full md:w-auto flex items-center justify-center gap-2 bg-rose-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md shadow-rose-100"
                    >
                      <Plus className="w-4 h-4" /> Add Medicine
                    </button>
                  </div>

                  {/* Medicines Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {medicines
                      .filter(m => {
                        const matchesSearch = m.name.toLowerCase().includes(medInventorySearch.toLowerCase());
                        const matchesCat = medInventoryCat === 'All' || m.category === medInventoryCat;
                        return matchesSearch && matchesCat;
                      })
                      .map(m => {
                        const totalUnits = (m.packs * m.loosePerPack) + m.loose;
                        const isLow = totalUnits < m.minStockLevel;

                        return (
                          <div
                            key={m.id}
                            className={`bg-white rounded-[2rem] p-6 border-2 transition-all shadow-sm flex flex-col justify-between ${
                              isLow
                                ? 'border-rose-400 bg-rose-50/10 shadow-rose-100/30'
                                : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className="space-y-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="text-lg font-black text-slate-800 tracking-tight">{m.name}</h4>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Category: {m.category}
                                  </span>
                                </div>
                                {isLow ? (
                                  <span className="flex items-center gap-1 bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">
                                    <AlertTriangle className="w-3 h-3" /> Low Stock
                                  </span>
                                ) : (
                                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                                    Good Stock
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100/80">
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Packs (Unopened)</p>
                                  <p className="text-sm font-black text-slate-700">{m.packs} packs</p>
                                  <p className="text-[9px] font-bold text-slate-400 italic">({m.loosePerPack} {m.unit} ea)</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Loose Qty (Open Pack)</p>
                                  <p className="text-sm font-black text-slate-700">{m.loose} {m.unit}</p>
                                </div>
                              </div>

                              <div className="flex justify-between items-center text-xs pt-1">
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Inventory</p>
                                  <p className={`text-lg font-black ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                                    {totalUnits} {m.unit}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alert Limit</p>
                                  <p className="font-bold text-slate-600">
                                    {m.minStockLevel} {m.unit}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-5 mt-5 border-t border-slate-100">
                              <button
                                onClick={() => {
                                  setEditingMedicineId(m.id);
                                  setNewMedicine(m);
                                  setIsMedicineFormOpen(true);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit Stock
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmDialog({
                                    isOpen: true,
                                    message: `Are you sure you want to delete "${m.name}" from your active pharmacy database? This cannot be undone.`,
                                    onConfirm: () => {
                                      deleteMedicine(m.id);
                                      setConfirmDialog(d => ({ ...d, isOpen: false }));
                                      setToastMessage(`Removed "${m.name}" from active records.`);
                                    }
                                  });
                                }}
                                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all flex items-center justify-center"
                                title="Delete Medicine Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    {medicines.length === 0 && (
                      <div className="col-span-full bg-white p-16 rounded-[2.5rem] border border-slate-100 text-center space-y-4">
                        <Pill className="w-12 h-12 text-slate-300 mx-auto" />
                        <h4 className="text-base font-black text-slate-700">No Medicines Registered</h4>
                        <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto uppercase tracking-wider leading-relaxed">
                          Your pharmacy is empty! Register vaccines, antibiotics, and supplements to enable automated dose tracking.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: REPORTS & ANALYTICS */}
              {healthSubTab === 'reports' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Period selector bar */}
                  <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div>
                      <h4 className="text-lg font-black text-slate-800 tracking-tight">Medicine Consumption Analysis</h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">View quantity reports across customized intervals</p>
                    </div>

                    <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl shadow-inner">
                      {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => setReportsPeriod(p)}
                          className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                            reportsPeriod === p
                              ? 'bg-white text-rose-600 shadow-sm border border-slate-100'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Graph visualization */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Stock Volume Administered</h4>
                      <p className="text-[9px] text-slate-400 font-bold italic">Y-Axis unit represents medicine's standard measurement unit (ml, g, doses etc.)</p>
                    </div>

                    {usageChartData.length > 0 ? (
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={usageChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis
                              dataKey="period"
                              stroke="#94a3b8"
                              fontSize={10}
                              fontWeight="bold"
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              stroke="#94a3b8"
                              fontSize={10}
                              fontWeight="bold"
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                background: '#1e293b',
                                border: 'none',
                                borderRadius: '1rem',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}
                            />
                            {/* Dynamically draw a bar for each unique medicine in inventory */}
                            {medicines.map((m, idx) => {
                              const barColors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316'];
                              const color = barColors[idx % barColors.length];
                              return (
                                <Bar
                                  key={m.id}
                                  dataKey={m.name}
                                  fill={color}
                                  radius={[4, 4, 0, 0]}
                                  maxBarSize={30}
                                />
                              );
                            })}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[200px] flex flex-col items-center justify-center text-slate-400 font-bold space-y-2">
                        <BarChart3 className="w-10 h-10 text-slate-300 animate-pulse" />
                        <span className="text-xs uppercase tracking-widest">No treatment events found for this interval</span>
                      </div>
                    )}
                  </div>

                  {/* PREDICTIVE DEMAND FORECAST & BENTO CARDS */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Demand Prediction & Forecasts</h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest px-1">Statistical forecast for the next 30 days based on past average usage</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {demandPredictions.map(item => {
                        const isShort = item.shortfall > 0;
                        return (
                          <div
                            key={item.medicine.id}
                            className={`bg-white rounded-[2.5rem] p-6 border-2 flex flex-col justify-between shadow-sm transition-all ${
                              isShort
                                ? 'border-amber-200 bg-amber-50/5 shadow-amber-100/20'
                                : 'border-slate-100'
                            }`}
                          >
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-base font-black text-slate-800">{item.medicine.name}</h4>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  Current Stock: {item.currentStock} {item.medicine.unit}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Past 30d Use</p>
                                  <p className="text-sm font-black text-slate-700">{item.pastUsage} {item.medicine.unit}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Projected 30d Demand</p>
                                  <p className="text-sm font-black text-slate-700">{item.projected} {item.medicine.unit}</p>
                                </div>
                              </div>

                              {isShort ? (
                                <div className="p-3 bg-amber-100/50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1.5 font-bold">
                                  <p className="flex items-center gap-1.5 uppercase text-[9px] font-black tracking-wider text-amber-700">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Order Recommendation
                                  </p>
                                  <p className="leading-relaxed">
                                    You may face a shortfall of <span className="font-black text-amber-950">{item.shortfall} {item.medicine.unit}</span> soon.
                                  </p>
                                  <p className="text-[10px] text-amber-600">
                                    Recommend ordering <span className="font-black text-amber-950">{item.recommendedPacks}</span> unopened pack(s) of {item.medicine.name}.
                                  </p>
                                </div>
                              ) : (
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 space-y-1 font-bold">
                                  <p className="flex items-center gap-1.5 uppercase text-[9px] font-black tracking-wider text-emerald-700">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Stock Sufficient
                                  </p>
                                  <p className="leading-relaxed">
                                    Your current inventory of {item.currentStock} {item.medicine.unit} is estimated to cover your usage for the next 30 days comfortably.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {demandPredictions.length === 0 && (
                        <div className="col-span-full bg-white p-12 rounded-[2.5rem] border border-slate-100 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                          No registered medicines to predict forecasts for.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'protocols' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
              {/* Header */}
              <div className="flex flex-col lg:flex-row gap-6 justify-between items-center bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Protocol Lab</h3>
                  <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Animal Synchronization &amp; Templates</p>
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  <button
                    onClick={() => {
                      generateProtocolListReport(enrollments.filter(e => e.status === 'Active'), protocols, animals, settings);
                    }}
                    className="flex items-center justify-center gap-3 bg-white text-slate-700 border-2 border-slate-100 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Printer className="w-5 h-5 text-blue-600" /> Print Active
                  </button>
                  <button
                    onClick={() => { setEditingReproId(null); setNewEnrollment({ startDate: new Date().toISOString().split('T')[0], animalIds: [] }); setProtocolAnimalSearch(''); setIsEnrollmentFormOpen(true); }}
                    className="flex items-center justify-center gap-3 bg-amber-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl shadow-amber-100"
                  >
                    <Zap className="w-5 h-5" /> Enroll Batch
                  </button>
                </div>
              </div>

              {/* Daily Steps Section */}
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const todaySteps = (enrollments || []).filter(e => e.status === 'Active').flatMap(enrollment => {
                  const template = protocols.find(t => t.id === enrollment.templateId);
                  if (!template || !template.steps) return [];
                  return template.steps
                    .map((step, idx) => ({ step, idx, enrollment, template, stepDate: dateUtils.addDays(enrollment.startDate, step.dayOffset) }))
                    .filter(s => !(enrollment.completedStepIndices || []).includes(s.idx) && s.stepDate === today);
                });
                if (todaySteps.length === 0) return null;
                return (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-[3rem] p-8 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-600 rounded-xl"><CalendarIcon className="w-5 h-5 text-white" /></div>
                        <div>
                          <h4 className="text-sm font-black text-amber-800 uppercase tracking-widest">Today's Protocol Steps</h4>
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{todaySteps.length} steps due today — {today}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          todaySteps.forEach(({ step, idx, enrollment }) => {
                            const newCompleted = [...enrollment.completedStepIndices, idx];
                            const template = protocols.find(t => t.id === enrollment.templateId);
                            const newStatus = newCompleted.length === (template?.steps?.length || 0) ? 'Completed' : 'Active';
                            updateEnrollment({ ...enrollment, completedStepIndices: newCompleted, status: newStatus as any });
                          });
                        }}
                        className="px-6 py-2 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-amber-700 transition-all"
                      >
                        Mark All Today Done
                      </button>
                    </div>
                    <div className="space-y-3">
                      {todaySteps.map(({ step, idx, enrollment, template }) => {
                        const animal = enrollment.animalIds?.length > 0 ? animals.find(a => a.id === enrollment.animalIds[0]) : null;
                        return (
                          <div key={`${enrollment.id}-${idx}`} className="bg-white rounded-2xl p-4 border border-amber-100 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-700 font-black text-xs">D{step.dayOffset}</div>
                              <div>
                                <p className="font-black text-slate-800">{animal?.tag || 'Unk'}</p>
                                <p className="text-xs text-slate-500 font-semibold">{step.action}{step.time ? ` @ ${step.time}` : ''} — {template.name}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const newCompleted = [...enrollment.completedStepIndices, idx];
                                const isFinished = newCompleted.length === template.steps.length;
                                updateEnrollment({ ...enrollment, completedStepIndices: newCompleted, status: isFinished ? 'Completed' : 'Active' });
                              }}
                              className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-amber-700 transition-all shadow-md"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Protocol Search & Filter Header */}
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-end">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Start Date Filter</label>
                      <input
                        type="date"
                        className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-amber-500/20"
                        value={protocolDateStart}
                        onChange={e => setProtocolDateStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">End Date Filter</label>
                      <input
                        type="date"
                        className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-amber-500/20"
                        value={protocolDateEnd}
                        onChange={e => setProtocolDateEnd(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Global Tag Search</label>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Find Cow in Groups..."
                          className="w-full pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-xs font-black shadow-inner outline-none"
                          value={protocolTagSearch}
                          onChange={e => setProtocolTagSearch(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {(protocolDateStart || protocolDateEnd || protocolTagSearch) && (
                      <button onClick={() => { setProtocolDateStart(''); setProtocolDateEnd(''); setProtocolTagSearch(''); }} className="px-6 py-3 text-xs font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest">
                        Reset
                      </button>
                    )}
                    <div className="flex p-1 bg-slate-100 rounded-2xl shadow-inner">
                      <button onClick={() => setProtocolView('active')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${protocolView === 'active' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        Active
                      </button>
                      <button onClick={() => setProtocolView('history')} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${protocolView === 'history' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        History
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 1: Manual Template Creation (at the top) */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-[3rem] p-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200">
                      <ClipboardList className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-slate-800">Enroll Batch Protocol</h4>
                      <p className="text-xs text-blue-600 font-black uppercase tracking-widest">Start new batch or manage custom templates</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setIsTemplateFormOpen(true); }}
                      className="flex items-center gap-3 bg-white border border-blue-200 text-blue-600 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm"
                    >
                      <Layers className="w-5 h-5" /> Add Template
                    </button>
                    <button
                      onClick={() => { setNewEnrollment({ startDate: new Date().toISOString().split('T')[0], animalIds: [] }); setIsEnrollmentFormOpen(true); }}
                      className="flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                    >
                      <Plus className="w-5 h-5" /> Enroll Batch
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Protocol Groups (Batches) */}
              <div className="space-y-8">
                <div className="flex items-center gap-4 px-2">
                  <div className="p-2 bg-amber-50 rounded-xl"><Activity className="w-5 h-5 text-amber-600" /></div>
                  <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">{protocolView === 'active' ? 'Active Batches' : 'Historical Batches'}</h4>
                </div>

                {(() => {
                  const filteredBatches = enrollments.filter(e => {
                    const isStatusMatch = protocolView === 'active' ? e.status === 'Active' : e.status !== 'Active';
                    const isDateMatch = (!protocolDateStart || e.startDate >= protocolDateStart) && (!protocolDateEnd || e.startDate <= protocolDateEnd);
                    const isTagMatch = !protocolTagSearch || (e.animalIds || []).some(id => animals.find(a => a.id === id)?.tag.toLowerCase().includes(protocolTagSearch.toLowerCase()));
                    return isStatusMatch && isDateMatch && isTagMatch;
                  }).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));

                  if (filteredBatches.length === 0) {
                    return (
                      <div className="bg-white p-20 rounded-[4rem] text-center border border-slate-100">
                        <FlaskConical className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                        <p className="text-lg font-black text-slate-400 uppercase tracking-widest">No batches found</p>
                        <p className="text-sm text-slate-300 font-bold mt-2">Adjust filters or enroll a new batch</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {filteredBatches.map(batch => {
                        const template = protocols.find(t => t.id === batch.templateId);
                        const progress = ((batch.completedStepIndices || []).length / (template?.steps?.length || 1)) * 100;
                        const nextStepIndex = (template?.steps || []).findIndex((_, idx) => !(batch.completedStepIndices || []).includes(idx)) ?? -1;
                        const nextStep = nextStepIndex !== -1 ? template?.steps?.[nextStepIndex] : null;
                        const nextStepDate = nextStep ? dateUtils.addDays(batch.startDate, nextStep.dayOffset) : null;

                        return (
                          <div key={batch.id} onClick={() => setSelectedEnrollmentDetail(batch)} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col group relative overflow-hidden cursor-pointer">
                            <div className="flex items-start justify-between mb-8">
                              <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-amber-50 rounded-[1.75rem] flex items-center justify-center text-amber-600 shadow-inner group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                                  <Layers className="w-8 h-8" />
                                </div>
                                <div>
                                  <h5 className="font-black text-slate-800 text-2xl group-hover:text-amber-600 transition-colors tracking-tighter">{template?.name || 'Protocol Batch'}</h5>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(batch.animalIds || []).length} Cows</span>
                                    <span className="text-[10px] text-slate-300">•</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Started {batch.startDate}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={(e) => {
                                  e.stopPropagation();
                                  // Generic report for entire batch
                                  generateProtocolListReport([batch], protocols, animals, settings);
                                }} className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-2xl transition-all"><Printer className="w-5 h-5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setConfirmDialog({ isOpen: true, message: `Delete this batch of ${(batch.animalIds || []).length} animals?`, onConfirm: () => { deleteEnrollment(batch.id); setConfirmDialog(d => ({ ...d, isOpen: false })); } }); }} className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-400 rounded-2xl transition-all"><Trash2 className="w-5 h-5" /></button>
                              </div>
                            </div>

                            <div className="flex-1 space-y-6">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  <span>Batch Progress</span>
                                  <span className="text-amber-600">{Math.round(progress)}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner p-0.5">
                                  <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                </div>
                              </div>

                              <div className="bg-slate-50/50 rounded-[2rem] border border-slate-100 p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                  <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Animals in Batch</h6>
                                  <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">ID: {batch.id}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {(batch.animalIds || []).map(id => {
                                    const a = animals.find(anim => anim.id === id);
                                    return (
                                      <span key={id} onClick={() => setSelectedAnimal(a || null)} className="px-3 py-1 bg-white border border-slate-100 rounded-xl text-[11px] font-black text-slate-600 hover:text-blue-600 hover:border-blue-200 cursor-pointer transition-all">
                                        {a?.tag || id}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>

                              {batch.status === 'Active' && nextStep && (
                                <div className="bg-amber-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-amber-100">
                                  <div className="flex items-center justify-between mb-4">
                                    <div>
                                      <p className="text-[10px] font-black text-amber-200 uppercase tracking-widest mb-1">Upcoming Batch Action</p>
                                      <h6 className="text-xl font-black tracking-tight">{nextStep.action}</h6>
                                    </div>
                                    <div className="p-3 bg-amber-500 rounded-2xl"><Zap className="w-6 h-6 text-white" /></div>
                                  </div>
                                  <div className="flex items-center justify-between gap-6 mt-6">
                                    <div className="flex items-center gap-3">
                                      <Clock className="w-5 h-5 text-amber-200" />
                                      <span className="text-sm font-bold text-amber-50">{nextStepDate} {nextStep.time ? `@ ${nextStep.time}` : ''}</span>
                                    </div>
                                    <button
                                      onClick={() => handleGroupStepDone(batch)}
                                      className="px-8 py-3 bg-white text-amber-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                                    >
                                      Step Done for All
                                    </button>
                                  </div>
                                </div>
                              )}

                              {batch.status !== 'Active' && (
                                <div className={`p-8 rounded-[2.5rem] flex items-center justify-center gap-4 ${batch.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}>
                                  {batch.status === 'Completed' ? <CheckCircle2 className="w-8 h-8" /> : <X className="w-8 h-8" />}
                                  <h6 className="text-xl font-black uppercase tracking-tighter">Batch {batch.status}</h6>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>


              {/* SECTION 2b: Protocol History */}
              {protocolView === 'history' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-4 px-2">
                      <div className="p-2 bg-slate-100 rounded-xl"><History className="w-5 h-5 text-slate-500" /></div>
                      <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Protocol History</h4>
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-tighter">{(enrollments || []).filter(e => e.status !== 'Active').length} Records</span>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Month</label>
                      <input type="month" className="px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-black shadow-inner outline-none" value={historyMonth} onChange={e => setHistoryMonth(e.target.value)} />
                      {historyMonth && <button onClick={() => setHistoryMonth('')} className="text-xs text-slate-400 hover:text-slate-600 font-black">Clear</button>}
                    </div>
                  </div>

                  {!selectedHistoryProtocolId ? (
                    // === HISTORY LIST VIEW (grouped by template) ===
                    (() => {
                      const historyEnrollments = enrollments.filter(e => e.status !== 'Active').filter(e => !historyMonth || e.startDate.startsWith(historyMonth));
                      if (historyEnrollments.length === 0) {
                        return (
                          <div className="bg-white p-20 rounded-[4rem] text-center border border-slate-100">
                            <History className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                            <p className="text-lg font-black text-slate-400 uppercase tracking-widest">No completed protocols</p>
                          </div>
                        );
                      }

                      const grouped: Record<string, { template: typeof protocols[0]; enrollments: typeof historyEnrollments }> = {};
                      historyEnrollments.forEach(enr => {
                        const template = protocols.find(t => t.id === enr.templateId);
                        if (!template) return;
                        if (!grouped[enr.templateId]) {
                          grouped[enr.templateId] = { template, enrollments: [] };
                        }
                        grouped[enr.templateId].enrollments.push(enr);
                      });

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Object.entries(grouped).map(([templateId, group]) => (
                            <div
                              key={templateId}
                              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                              onClick={() => setSelectedHistoryProtocolId(templateId)}
                            >
                              <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner">
                                    <History className="w-7 h-7" />
                                  </div>
                                  <div>
                                    <h5 className="font-black text-slate-800 text-xl group-hover:text-blue-600 transition-colors">{group.template.name}</h5>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{(group.template?.steps || []).length} Steps</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-3xl font-black text-slate-600">{group.enrollments.length}</p>
                                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Records</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 group-hover:text-blue-600 transition-colors mt-6">
                                <span>Click to view history</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ) : (
                    // === PROTOCOL HISTORY DETAIL VIEW ===
                    (() => {
                      const template = protocols.find(t => t.id === selectedHistoryProtocolId);
                      if (!template) return null;
                      const protocolEnrollments = enrollments.filter(e => e.status !== 'Active' && e.templateId === selectedHistoryProtocolId).filter(e => !historyMonth || e.startDate.startsWith(historyMonth));

                      return (
                        <div className="space-y-6">
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <History className="w-6 h-6 text-slate-500" />
                              <div>
                                <h5 className="font-black text-slate-800 text-lg">{template.name}</h5>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{protocolEnrollments.length} Historical Records</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => generateProtocolListReport(protocolEnrollments, protocols, animals, settings)}
                                className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-sm"
                                title="Print this protocol's history"
                              >
                                <Printer className="w-4 h-4 text-slate-500" /> Print List
                              </button>
                              <button
                                onClick={() => setSelectedHistoryProtocolId(null)}
                                className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-sm"
                              >
                                ← Back
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {protocolEnrollments.map(enrollment => {
                              const animal = animals.find(a => a.id === (enrollment as any).animalId || enrollment.animalIds?.[0]);
                              const progress = (enrollment.completedStepIndices.length / template.steps.length) * 100;
                              return (
                                <div key={enrollment.id} onClick={() => setSelectedEnrollmentDetail(enrollment)} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer">
                                  <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-lg border border-slate-100">
                                        {(animal?.tag || '??').slice(-2)}
                                      </div>
                                      <div>
                                        <h5 className="font-black text-slate-800 text-xl">{(enrollment.animalIds?.length > 1) ? `Batch (${enrollment.animalIds.length})` : animal?.tag || 'Unknown'}</h5>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Started: {enrollment.startDate}</p>
                                      </div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${enrollment.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                      {enrollment.status}
                                    </span>
                                  </div>
                                  <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                      <span>Progress: {enrollment.completedStepIndices.length}/{template.steps.length} steps</span>
                                      <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                      <div className="h-full bg-slate-400 transition-all" style={{ width: `${progress}%` }}></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* SECTION 3: Template Library (at the bottom) */}
              <div className="space-y-8">
                <div className="flex items-center gap-4 px-2">
                  <div className="p-2 bg-slate-100 rounded-xl">
                    <ClipboardList className="w-5 h-5 text-slate-500" />
                  </div>
                  <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Template Library</h4>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                    {protocols.length} Templates
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {protocols.map(p => (
                    <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 group hover:shadow-xl transition-all relative overflow-hidden">
                      {!p.isPredefined && (
                        <button
                          onClick={() => deleteProtocolTemplate(p.id)}
                          className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`p-3 rounded-2xl ${p.isPredefined ? 'bg-slate-50 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                          <FlaskConical className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{p.name}</h5>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${p.isPredefined ? 'text-slate-400' : 'text-blue-500'
                            }`}>{p.isPredefined ? '🔒 Standard / Predefined' : '✏️ Custom / Manual'}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold mb-6 line-clamp-2">{p.description || 'No description provided.'}</p>
                      <div className="space-y-2 mb-6">
                        {p.steps.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                            <span className="w-8 h-5 bg-slate-100 rounded text-center leading-5 font-black text-slate-600 flex-shrink-0">D{step.dayOffset}</span>
                            <span className="truncate">{step.action}</span>
                            {step.time && <span className="text-slate-300 flex-shrink-0">@ {step.time}</span>}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                        <span className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-tighter">{p.steps.length} Steps</span>
                        <span className="px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-tighter">{p.steps[p.steps.length - 1]?.dayOffset || 0} Days Total</span>
                        <button
                          onClick={() => { setNewEnrollment({ startDate: new Date().toISOString().split('T')[0], animalIds: [], templateId: p.id }); setProtocolAnimalSearch(''); setIsEnrollmentFormOpen(true); }}
                          className="ml-auto px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-amber-600 hover:text-white transition-all border border-amber-100"
                        >
                          Enroll →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'reports' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-xl shadow-blue-100">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Intelligence Hub</h3>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] mt-2">Professional Data Exports & Analytics</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Report Parameters</h4>
                    
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Dataset Type</label>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { id: 'summary', label: 'Executive Herd Summary', icon: LayoutDashboard },
                          { id: 'repro', label: 'Reproduction Activity Log', icon: Activity },
                          { id: 'pd-check', label: 'Pregnancy Diagnosis (PD) Checks', icon: CheckCircle2 },
                          { id: 'health', label: 'Clinical & Treatment Records', icon: HeartPulse },
                          { id: 'treatment-analysis', label: 'Treatment & Dosage Report', icon: ClipboardList },
                          { id: 'medicine-inventory', label: 'Medicine Inventory Report', icon: Package },
                          { id: 'low-stock', label: 'Low Stock Warnings Report', icon: AlertCircle },
                          { id: 'demand-forecast', label: '30D Demand & Forecast Report', icon: TrendingUp },
                          { id: 'individual', label: 'Individual Focus Analysis', icon: Target }
                        ].map(type => (
                          <button
                            key={type.id}
                            onClick={() => setSelectedReportType(type.id as any)}
                            className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                              selectedReportType === type.id 
                                ? 'bg-blue-50 border-blue-600 shadow-sm' 
                                : 'bg-white border-slate-50 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <type.icon className={`w-5 h-5 ${selectedReportType === type.id ? 'text-blue-600' : 'text-slate-400'}`} />
                              <span className={`text-xs font-black uppercase tracking-wider ${selectedReportType === type.id ? 'text-blue-700' : 'text-slate-600'}`}>
                                {type.label}
                              </span>
                            </div>
                            {selectedReportType === type.id && <Check className="w-4 h-4 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Temporal Window</label>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="date"
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black shadow-inner"
                          value={reportStartDate}
                          onChange={e => setReportStartDate(e.target.value)}
                        />
                        <input
                          type="date"
                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-black shadow-inner"
                          value={reportEndDate}
                          onChange={e => setReportEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {selectedReportType === 'individual' && (
                      <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest px-2">Patient Selection</label>
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Type Tag (e.g. PK-12)..."
                            className="w-full pl-12 pr-4 py-4 bg-rose-50/30 border-none rounded-2xl text-xs font-black shadow-inner"
                            value={reportAnimalSearch}
                            onChange={e => { setReportAnimalSearch(e.target.value); if(!e.target.value) setReportAnimalId(''); }}
                          />
                        </div>
                        {reportAnimalSearch && !reportAnimalId && (
                           <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 space-y-1 max-h-40 overflow-y-auto">
                             {animals.filter(a => a.tag.toLowerCase().includes(reportAnimalSearch.toLowerCase())).slice(0, 8).map(a => (
                               <button key={a.id} onClick={() => { setReportAnimalId(a.id); setReportAnimalSearch(a.tag); }} className="w-full text-left px-4 py-3 hover:bg-rose-50 rounded-xl text-xs font-black uppercase text-slate-600 hover:text-rose-600 transition-colors">{a.tag}</button>
                             ))}
                           </div>
                        )}
                      </div>
                    )}

                    <div className="pt-8 border-t border-slate-50">
                      <button
                        onClick={executeReportExport}
                        className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                      >
                        <Download className="w-6 h-6" /> Export High-Fidelity PDF
                      </button>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center mt-6 leading-relaxed">
                        * Reports are generated locally and optimized for A4 printing. <br/> Reproduction reports include latest PD status logic.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:grid grid-cols-1 gap-6">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-12 rounded-[3.5rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
                    <FileText className="w-24 h-24 absolute -bottom-4 -right-4 opacity-10 rotate-12" />
                    <h4 className="text-2xl font-black tracking-tight leading-tight mb-4">Aero PDF Engine</h4>
                    <p className="text-sm text-blue-100 font-medium leading-relaxed opacity-80">
                      Our proprietary export system generates optimized, tamper-evident documents for official farm records, insurance submissions, and veterinary audits.
                    </p>
                  </div>
                  <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic">Export Previews</h5>
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-4 items-center">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-100"></div>
                          <div className="flex-1 space-y-1">
                            <div className="h-2 w-1/2 bg-slate-100 rounded"></div>
                            <div className="h-1.5 w-1/3 bg-slate-50 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
             </div>
          )}

          {view === 'settings' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto space-y-10">
              <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-6 mb-12">
                  <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-xl shadow-blue-100">
                    <SettingsIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">System Parameters</h3>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">Reproduction Bio-Settings</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Gestation (Days)</label>
                    <input
                      type="number"
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner focus:ring-2 focus:ring-blue-600/20"
                      value={settings.gestationDays}
                      onChange={(e) => updateSettings({ ...settings, gestationDays: parseInt(e.target.value) || 283 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Preg Check Window (Days)</label>
                    <input
                      type="number"
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner focus:ring-2 focus:ring-blue-600/20"
                      value={settings.pregnancyCheckDays}
                      onChange={(e) => updateSettings({ ...settings, pregnancyCheckDays: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Dry Period (Days)</label>
                    <input
                      type="number"
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner focus:ring-2 focus:ring-blue-600/20"
                      value={settings.dryPeriodDays}
                      onChange={(e) => updateSettings({ ...settings, dryPeriodDays: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Closeup Phase (Days)</label>
                    <input
                      type="number"
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner focus:ring-2 focus:ring-blue-600/20"
                      value={settings.closeupDays}
                      onChange={(e) => updateSettings({ ...settings, closeupDays: parseInt(e.target.value) || 21 })}
                    />
                  </div>
                </div>
                <div className="mt-10 space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Farm Identity</h4>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Farm Name</label>
                    <input
                      type="text"
                      className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner focus:ring-2 focus:ring-blue-600/20"
                      value={settings.farmName}
                      onChange={(e) => updateSettings({ ...settings, farmName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-10 space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Status Color Palette</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {([
                      { key: 'active', label: 'Active' },
                      { key: 'pregnant', label: 'Pregnant' },
                      { key: 'sick', label: 'Sick' },
                      { key: 'dry', label: 'Dry' },
                      { key: 'closeup', label: 'Closeup' },
                      { key: 'inProtocol', label: 'In Protocol' },
                      { key: 'inseminated', label: 'Inseminated' },
                      { key: 'observation', label: 'Observation' },
                    ] as const).map(({ key, label }) => (
                      <div key={key} className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-10 h-10 rounded-xl border-2 border-slate-200 overflow-hidden shadow-inner">
                          <input
                            type="color"
                            className="w-12 h-12 -m-1 cursor-pointer border-none"
                            value={settings.statusColors[key]}
                            onChange={(e) => updateSettings({ ...settings, statusColors: { ...settings.statusColors, [key]: e.target.value } })}
                          />
                        </div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-12 pt-10 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-bold italic">Auto-Sync via Firebase</p>
                  <button onClick={() => window.location.reload()} className="flex items-center gap-3 bg-slate-800 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg scale-100 hover:scale-[1.02]">
                    <Save className="w-5 h-5" /> Sync Data
                  </button>
                </div>
                {/* Group Management */}
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Herd Group Management</h4>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="New group name (e.g. Elite A)"
                        className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner focus:ring-2 focus:ring-blue-600/20"
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                        onKeyDown={e => {
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
                        onClick={() => {
                          if (newGroupName.trim()) {
                            const groups = settings.customGroups || [];
                            if (!groups.includes(newGroupName.trim())) {
                              updateSettings({ ...settings, customGroups: [...groups, newGroupName.trim()] });
                            }
                            setNewGroupName('');
                          }
                        }}
                        className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-blue-700 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(settings.customGroups || []).map((group, idx) => (
                        <div key={group} className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] font-black text-slate-300">#{idx + 1}</span>
                          <span className="text-xs font-black text-slate-700">{group}</span>
                          <button
                            onClick={() => updateSettings({ ...settings, customGroups: (settings.customGroups || []).filter(g => g !== group) })}
                            className="text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {(!settings.customGroups || settings.customGroups.length === 0) && (
                        <p className="text-xs text-slate-300 font-bold italic">No custom groups yet. Add one above.</p>
                      )}
                    </div>
                  </div>
                </div>
                {/* Backup & Restore */}
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 mt-6">
                  <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-3">Backup & Restore</h4>
                  <p className="text-[10px] text-emerald-600 font-bold mb-4">Download or restore a full JSON backup of your farm data.</p>
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={exportBackup} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md">
                      <Download className="w-4 h-4" /> Export Backup
                    </button>
                    <label className="flex items-center gap-2 bg-white border border-emerald-200 text-emerald-700 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm cursor-pointer">
                      <Upload className="w-4 h-4" /> Restore from File
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const text = await file.text();
                          try {
                            const data = JSON.parse(text);
                            if (confirm(`Restore backup from "${file.name}"? This will overwrite all current data.`)) {
                              const { storageService } = await import('./services/storage');
                              if (data.animals) await storageService.saveAnimals(data.animals);
                              if (data.reproEvents) await storageService.saveReproEvents(data.reproEvents);
                              if (data.healthEvents) await storageService.saveHealthEvents(data.healthEvents);
                              if (data.enrollments) await storageService.saveEnrollments(data.enrollments);
                              if (data.customProtocols) await storageService.saveCustomProtocols(data.customProtocols);
                              if (data.settings) await storageService.saveSettings(data.settings);
                              alert('Backup restored successfully! Reloading...');
                              window.location.reload();
                            }
                          } catch {
                            alert('Invalid backup file. Please use a valid JSON export.');
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'pd-check' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10 max-w-6xl mx-auto">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="bg-indigo-600 p-4 rounded-[1.5rem] shadow-xl shadow-indigo-100">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-none">PD Diagnostics Hub</h3>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em] mt-2">Pregnancy Diagnosis Management & Audits</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <button
                  onClick={() => setIsNewPdFormOpen(true)}
                  className="p-6 bg-emerald-50 border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-100/50 rounded-[2rem] transition-all flex items-center gap-4 text-left group shadow-sm shadow-emerald-50"
                >
                  <div className="p-4 bg-emerald-500 text-white rounded-2xl group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-emerald-800 text-sm uppercase tracking-wider">New PD Check</h4>
                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Record today's exam in 1-click</p>
                  </div>
                </button>

                <button
                  onClick={() => setIsOldPdFormOpen(true)}
                  className="p-6 bg-blue-50 border border-blue-100 hover:border-blue-300 hover:bg-blue-100/50 rounded-[2rem] transition-all flex items-center gap-4 text-left group shadow-sm shadow-blue-50"
                >
                  <div className="p-4 bg-blue-500 text-white rounded-2xl group-hover:scale-110 transition-transform">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-blue-800 text-sm uppercase tracking-wider">Add Old Check</h4>
                    <p className="text-[10px] text-blue-600 font-bold mt-0.5">Record checks from past days</p>
                  </div>
                </button>

                <button
                  onClick={() => setIsMultiPdFormOpen(true)}
                  className="p-6 bg-indigo-50 border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-100/50 rounded-[2rem] transition-all flex items-center gap-4 text-left group shadow-sm shadow-indigo-50"
                >
                  <div className="p-4 bg-indigo-500 text-white rounded-2xl group-hover:scale-110 transition-transform">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-indigo-800 text-sm uppercase tracking-wider">Multi-Enter</h4>
                    <p className="text-[10px] text-indigo-600 font-bold mt-0.5">Bulk paste lists of checks</p>
                  </div>
                </button>
              </div>

              {/* Statistics Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
                  <div className="p-4 bg-slate-100 text-slate-600 rounded-[1.25rem]">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total PD Checks</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{pdChecks.length}</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[1.25rem]">
                    <span className="text-xl">🤰</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pregnant Checks</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">
                      {pdChecks.filter(e => e.pregnancyResult === 'Pregnant').length}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
                  <div className="p-4 bg-rose-50 text-rose-600 rounded-[1.25rem]">
                    <span className="text-xl">❌</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Open Checks</p>
                    <p className="text-2xl font-black text-rose-600 mt-1">
                      {pdChecks.filter(e => e.pregnancyResult !== 'Pregnant').length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Search & Audit Table */}
              <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden font-sans">
                <div className="p-8 md:p-10 border-b border-slate-100 space-y-6 bg-slate-50/50">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h4 className="text-xl font-black text-slate-800 tracking-tight">Recorded Diagnosis Registry</h4>
                      <p className="text-xs text-slate-400 font-bold mt-1">Full chronological audit trail of reproductive examinations</p>
                    </div>
                    {/* PDF Export Button */}
                    <button
                      onClick={() => {
                        const label = (pdStartDate || pdEndDate) 
                          ? `${formatDateReadable(pdStartDate) || 'Start'} to ${formatDateReadable(pdEndDate) || 'End'}` 
                          : 'Full Record';
                        generatePdCheckSectionReport(filteredPdChecks, animals, settings, label);
                      }}
                      className="flex items-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-indigo-100 self-start md:self-auto"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export Registry PDF</span>
                    </button>
                  </div>

                  {/* Filter controls row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2">
                    <div className="sm:col-span-5 relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by Cow Tag or Date..."
                        className="w-full pl-10 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-600/20"
                        value={pdSearchTerm}
                        onChange={e => setPdSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-3 relative">
                      <input
                        type="date"
                        className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-600/20"
                        placeholder="Start Date"
                        value={pdStartDate}
                        onChange={e => setPdStartDate(e.target.value)}
                      />
                      {pdStartDate && (
                        <span className="absolute right-3 top-1 text-[8px] font-black uppercase text-slate-400 select-none">From</span>
                      )}
                    </div>
                    <div className="sm:col-span-3 relative">
                      <input
                        type="date"
                        className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-600/20"
                        placeholder="End Date"
                        value={pdEndDate}
                        onChange={e => setPdEndDate(e.target.value)}
                      />
                      {pdEndDate && (
                        <span className="absolute right-3 top-1 text-[8px] font-black uppercase text-slate-400 select-none">To</span>
                      )}
                    </div>
                    <div className="sm:col-span-1">
                      <button
                        type="button"
                        onClick={() => {
                          setPdSearchTerm('');
                          setPdStartDate('');
                          setPdEndDate('');
                        }}
                        disabled={!pdSearchTerm && !pdStartDate && !pdEndDate}
                        className="w-full h-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-1 animate-in fade-in duration-300"
                        title="Clear Filters"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {filteredPdChecks.length === 0 ? (
                  <div className="p-16 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto border border-dashed border-slate-200">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-slate-800 font-black text-base">No PD Checks Found</p>
                      <p className="text-slate-400 text-xs font-bold mt-1">Try entering a search term or record a new diagnosis check.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                          <th className="px-8 py-4">Badge #</th>
                          <th className="px-8 py-4">Check Date</th>
                          <th className="px-8 py-4">Animal ID</th>
                          <th className="px-8 py-4">Examination Result</th>
                          <th className="px-8 py-4">Notes / Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredPdChecks.map((check) => {
                          const animal = animals.find(a => a.id === check.animalId);
                          const isPreg = check.pregnancyResult === 'Pregnant';
                          const style = getBadgeStyleForDate(check.date);
                          return (
                            <tr key={check.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-5">
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border border-opacity-30 ${style.bg}`}>
                                  {style.badgeNum}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-sm font-black text-slate-800">
                                {formatDateReadable(check.date)}
                              </td>
                              <td className="px-8 py-5 text-sm font-extrabold text-blue-600">
                                Cow {animal?.tag || 'Unregistered'}
                              </td>
                              <td className="px-8 py-5">
                                <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                                  isPreg ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {isPreg ? '🤰 Pregnant' : '❌ Open'}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-xs text-slate-500 font-bold max-w-xs truncate">
                                {check.details || '--'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile/Tablet Bottom Navigation Bar */}
        {!isDesktop && (
          <nav className={`${isSimulated ? 'absolute' : 'fixed'} bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 flex items-center justify-around z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.03)]`}>
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'animals', label: 'Herd Hub', icon: Users },
              { id: 'repro', label: 'Repro', icon: CalendarRange },
              { id: 'health', label: 'Health', icon: Stethoscope },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id as ViewState); setIsSidebarOpen(false); }}
                  className="flex flex-col items-center gap-1 py-1.5 px-3 text-center rounded-xl transition-all relative min-w-[64px]"
                >
                  <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`} />
                  <span className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'text-blue-600 font-extrabold' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 w-1.5 h-1.5 bg-blue-600 rounded-full shadow-sm shadow-blue-300" />
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex flex-col items-center gap-1 py-1.5 px-3 text-center rounded-xl transition-all relative min-w-[64px]"
            >
              <Menu className={`w-5 h-5 transition-transform duration-300 ${isSidebarOpen ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`} />
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Menu
              </span>
              {isSidebarOpen && (
                <span className="absolute bottom-0 w-1.5 h-1.5 bg-blue-600 rounded-full shadow-sm shadow-blue-300" />
              )}
            </button>
          </nav>
        )}
      </main>

      {/* ====== ALERT PANEL SLIDE-IN ====== */}
      {isAlertPanelOpen && (
        <div className="fixed inset-0 z-[180] flex justify-end" onClick={() => setIsAlertPanelOpen(false)}>
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-8 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Alert Center</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{alerts.length} Active Notifications</p>
                </div>
              </div>
              <button onClick={() => setIsAlertPanelOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Alert Categories */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 opacity-40">
                  <CheckCircle2 className="w-20 h-20 text-slate-200 mb-4" />
                  <p className="text-sm text-slate-400 font-black tracking-widest uppercase">All Clear</p>
                  <p className="text-xs text-slate-300 font-bold mt-2">No active alerts</p>
                </div>
              ) : (
                (['Protocol', 'Health', 'Repro', 'System'] as const).map(category => {
                  const catAlerts = alerts.filter(a => a.type === category);
                  if (catAlerts.length === 0) return null;
                  const catConfig = {
                    Protocol: { color: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', label: '🧪 Protocol Lab' },
                    Health: { color: 'bg-rose-50 border-rose-200', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', label: '🩺 Health Bay' },
                    Repro: { color: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', label: '🐄 Reproduction' },
                    System: { color: 'bg-slate-50 border-slate-200', badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500', label: '⚙️ System' },
                  }[category];
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full ${catConfig.dot}`}></div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{catConfig.label}</h4>
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-black ${catConfig.badge}`}>{catAlerts.length}</span>
                      </div>
                      <div className="space-y-3">
                        {catAlerts.map(alert => (
                          <div key={alert.id} className={`p-5 rounded-[1.5rem] border ${catConfig.color} transition-all hover:shadow-md`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${alert.priority === 'High' ? 'bg-rose-500' : 'bg-amber-400'}`}></span>
                                  <p className="text-sm font-black text-slate-800 truncate">{alert.title}</p>
                                </div>
                                <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-2">{alert.description}</p>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-slate-100 shadow-sm">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase">{alert.dueDate}</span>
                                  </div>
                                  {alert.priority === 'High' && (
                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[9px] font-black rounded-full uppercase tracking-wider">Urgent</span>
                                  )}
                                </div>
                              </div>
                              {alert.animalId && (
                                <button
                                  onClick={() => { setSelectedAnimal(animals.find(a => a.id === alert.animalId) || null); setIsAlertPanelOpen(false); }}
                                  className="flex-shrink-0 p-2 bg-white rounded-xl hover:bg-blue-50 hover:text-blue-600 text-slate-400 transition-all border border-slate-100 shadow-sm"
                                  title="View Animal"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => { setView('dashboard'); setIsAlertPanelOpen(false); }}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animal Detail Modal (Profile) */}
      {selectedAnimal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in slide-in-from-bottom-10 duration-500">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-blue-600 font-black text-3xl border border-slate-100 shadow-inner">
                  {selectedAnimal.tag.slice(-2)}
                </div>
                <div>
                  <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{selectedAnimal.tag}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">{selectedAnimal.breed}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const repros = reproEvents.filter(e => e.animalId === selectedAnimal.id)
                      .filter(e => (!animalReportStart || e.date >= animalReportStart) && (!animalReportEnd || e.date <= animalReportEnd));
                    const healths = healthEvents.filter(e => e.animalId === selectedAnimal.id)
                      .filter(e => (!animalReportStart || e.date >= animalReportStart) && (!animalReportEnd || e.date <= animalReportEnd));
                    const label = (animalReportStart || animalReportEnd)
                      ? `${animalReportStart || 'Start'} to ${animalReportEnd || 'End'}`
                      : 'Full History';
                    generateIndividualAnimalReport(selectedAnimal, repros, healths, label, settings);
                  }}
                  className="p-5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-[1.5rem] transition-all"
                  title="Download Filtered Report"
                >
                  <Download className="w-7 h-7" />
                </button>
                <button
                  onClick={() => {
                    const text = generateAnimalShareText(selectedAnimal, reproEvents, healthEvents);
                    shareToWhatsApp(text);
                  }}
                  className="p-5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-[1.5rem] transition-all"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-7 h-7" />
                </button>
                <button onClick={() => setSelectedAnimal(null)} className="p-5 hover:bg-slate-100 rounded-[1.5rem] transition-all text-slate-400">
                  <X className="w-8 h-8" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-12">
              <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100/50 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Report Parameter Selection</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filter From Date</label>
                    <input
                      type="date"
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={animalReportStart}
                      onChange={(e) => setAnimalReportStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filter To Date</label>
                    <input
                      type="date"
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={animalReportEnd}
                      onChange={(e) => setAnimalReportEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Life Status</p>
                  <p className={`text-sm font-black uppercase inline-block px-3 py-1 rounded-lg border ${getStatusColor(selectedAnimal.status)}`}>{selectedAnimal.status}</p>
                </div>
                {(selectedAnimal.pregnancyDays !== undefined && selectedAnimal.pregnancyDays > 0) && (
                  <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 shadow-inner">
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-2">Pregnancy Days</p>
                    <p className="text-lg font-black text-blue-800">{selectedAnimal.pregnancyDays} Days</p>
                  </div>
                )}
                {selectedAnimal.expectedCalving && (
                  <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 shadow-inner">
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-2">Exp. Calving Date</p>
                    <p className="text-lg font-black text-emerald-800">{selectedAnimal.expectedCalving}</p>
                  </div>
                )}
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Genetic Breed</p>
                  <p className="text-lg font-black text-slate-800">{selectedAnimal.breed}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Age Context</p>
                  <p className="text-lg font-black text-slate-800">{dateUtils.diffDays(new Date().toISOString().split('T')[0], selectedAnimal.dob)} Days</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Herd Assigned</p>
                  <p className="text-lg font-black text-slate-800">{selectedAnimal.herd}</p>
                </div>
              </div>

              <div className="space-y-8">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                  <CalendarRange className="w-6 h-6 text-blue-500" /> Lifecycle Chronology
                </h4>
                <div className="space-y-4">
                  {reproEvents.filter(e => e.animalId === selectedAnimal.id)
                    .filter(e => (!animalReportStart || e.date >= animalReportStart) && (!animalReportEnd || e.date <= animalReportEnd))
                    .map(e => (
                      <div key={e.id} className="flex items-center gap-6 p-6 rounded-[2rem] border border-slate-100 bg-white hover:bg-slate-50 transition-all shadow-sm">
                        <div className="p-4 rounded-2xl bg-slate-50 text-slate-400 transition-all">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-base font-black text-slate-800">{e.type}</p>
                            <button onClick={(event) => handleEditRepro(e, event)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 font-semibold">{e.details}</p>
                          <div className="flex gap-4 mt-2">
                            {e.technician && <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">Tech: {e.technician}</span>}
                            {e.semenName && <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-md">Semen: {e.semenName}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">{e.date}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-white flex gap-4 flex-wrap">
              <button
                onClick={() => { setEditingReproId(null); setNewRepro({ type: ReproEventType.ESTRUS, date: new Date().toISOString().split('T')[0], animalId: selectedAnimal.id }); setReproAnimalSearch(selectedAnimal.tag); setIsReproFormOpen(true); setSelectedAnimal(null); }}
                className="flex-1 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
              >
                Log Repro Event
              </button>
              <button
                onClick={() => { setEditingHealthId(null); setNewHealth({ type: HealthEventType.ILLNESS, date: new Date().toISOString().split('T')[0], animalId: selectedAnimal.id, treatments: [{ name: '', dose: '' }] }); setHealthAnimalSearch(selectedAnimal.tag); setIsHealthFormOpen(true); setSelectedAnimal(null); }}
                className="flex-1 py-4 bg-rose-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-700 transition-all shadow-xl shadow-rose-100"
              >
                Log Health Issue
              </button>
              <button
                onClick={(e) => handleDeleteAnimal(selectedAnimal, e)}
                className="py-4 px-6 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-50 hover:text-rose-600 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forms Modals */}
      <FormModal title={editingAnimalId ? "Edit Animal Record" : "Add New Animal"} isOpen={isAnimalFormOpen} onClose={() => setIsAnimalFormOpen(false)}>
        <form onSubmit={handleAddAnimal} className="space-y-6">
          {/* Calf Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Register as Calf</p>
              <p className="text-[10px] text-slate-400 font-bold">Enable for newborn/young animals</p>
            </div>
            <button
              type="button"
              onClick={() => setNewAnimal({ ...newAnimal, isCalf: !newAnimal.isCalf })}
              className={`w-14 h-7 rounded-full transition-all duration-300 relative flex-shrink-0 ${newAnimal.isCalf ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-all duration-300 ${newAnimal.isCalf ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tag Identifier *</label>
              <input required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="e.g. COW-701" value={newAnimal.tag || ''} onChange={e => setNewAnimal({ ...newAnimal, tag: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Breed</label>
              <input className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="e.g. Jersey" value={newAnimal.breed || ''} onChange={e => setNewAnimal({ ...newAnimal, breed: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* DOB only for calves */}
            {newAnimal.isCalf && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</label>
                <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newAnimal.dob || ''} onChange={e => setNewAnimal({ ...newAnimal, dob: e.target.value })} />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sex</label>
              <select className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newAnimal.sex || 'Female'} onChange={e => setNewAnimal({ ...newAnimal, sex: e.target.value as any })}>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Herd / Group</label>
            <select
              className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner"
              value={newAnimal.herd || ''}
              onChange={e => setNewAnimal({ ...newAnimal, herd: e.target.value })}
            >
              <option value="">Select group...</option>
              {(settings.customGroups || ['Main Herd', 'Elite', 'High Group', 'Medium Group', 'Heifers', 'Breeding']).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 mt-4">
            {editingAnimalId ? "Save Changes" : "Complete Registration"}
          </button>
        </form>
      </FormModal>
      
      {/* Protocol Detail Modal */}
      <FormModal
        title="Protocol Batch Details"
        isOpen={!!selectedEnrollmentDetail}
        onClose={() => setSelectedEnrollmentDetail(null)}
      >
        {selectedEnrollmentDetail && (() => {
          const template = protocols.find(t => t.id === selectedEnrollmentDetail.templateId);
          const batchAnimals = selectedEnrollmentDetail.animalIds.map(id => animals.find(a => a.id === id)).filter(Boolean) as Animal[];
          return (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-black text-slate-800 tracking-tight">{template?.name || 'Protocol Batch'}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${selectedEnrollmentDetail.status === 'Active' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                      {selectedEnrollmentDetail.status}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Started {selectedEnrollmentDetail.startDate}</span>
                  </div>
                </div>
                <button 
                  onClick={() => generateProtocolListReport([selectedEnrollmentDetail], protocols, animals, settings)}
                  className="p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-100 transition-all shadow-sm"
                  title="Print Detailed Status Report"
                >
                  <Printer className="w-5 h-5 text-blue-600" />
                </button>
              </div>

              <div>
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Enrolled Animals ({batchAnimals.length})</h5>
                <div className="flex flex-wrap gap-2">
                  {batchAnimals.map(a => (
                    <span key={a.id} className="px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-xs font-black text-slate-600">
                      {a.tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Timeline & Status</h5>
                <div className="space-y-3">
                  {template?.steps.map((step, idx) => {
                    const isDone = selectedEnrollmentDetail.completedStepIndices.includes(idx);
                    const stepDate = dateUtils.addDays(selectedEnrollmentDetail.startDate, step.dayOffset);
                    return (
                      <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isDone ? 'bg-emerald-50/50 border-emerald-100 opacity-60' : 'bg-white border-slate-100'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            D{step.dayOffset}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-sm">{step.action}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{stepDate} {step.time ? `@ ${step.time}` : ''}</p>
                          </div>
                        </div>
                        {isDone ? (
                          <div className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Done</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Clock className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Planned</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </FormModal>

      <FormModal title={editingReproId ? "Modify Repro Record" : "Log Repro Event"} isOpen={isReproFormOpen} onClose={() => { setIsReproFormOpen(false); setReproAnimalSearch(''); }}>
        <form onSubmit={handleAddRepro} className="space-y-6">
          {/* Cow Tag Searchable Autocomplete */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cow Tag *</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                required={!newRepro.animalId}
                placeholder="Search and select cow..."
                className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500/20"
                value={reproAnimalSearch}
                onChange={e => { setReproAnimalSearch(e.target.value); setReproAnimalDropdown(true); if (!e.target.value) setNewRepro({ ...newRepro, animalId: '' }); }}
                onFocus={() => setReproAnimalDropdown(true)}
                disabled={!!editingReproId}
              />
              {newRepro.animalId && <CheckCircle2 className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />}
            </div>
            {reproAnimalDropdown && reproAnimalSearch && !editingReproId && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {animals.filter(a => a.tag.toLowerCase().includes(reproAnimalSearch.toLowerCase()) || (a.name && a.name.toLowerCase().includes(reproAnimalSearch.toLowerCase()))).slice(0, 8).map(a => (
                  <button key={a.id} type="button"
                    onClick={() => { setNewRepro({ ...newRepro, animalId: a.id }); setReproAnimalSearch(a.tag); setReproAnimalDropdown(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left ${newRepro.animalId === a.id ? 'bg-blue-50' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-black text-slate-800">{a.tag}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{a.status} • {a.breed}</p>
                    </div>
                    {newRepro.animalId === a.id && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
                {animals.filter(a => a.tag.toLowerCase().includes(reproAnimalSearch.toLowerCase())).length === 0 && (
                  <p className="text-center py-4 text-xs text-slate-400 font-bold">No animals found</p>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <select className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newRepro.type || ReproEventType.ESTRUS} onChange={e => setNewRepro({ ...newRepro, type: e.target.value as any })}>
              {Object.values(ReproEventType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newRepro.date || ''} onChange={e => setNewRepro({ ...newRepro, date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Technician Name</label>
              <input className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="Dr. Smith" value={newRepro.technician || ''} onChange={e => setNewRepro({ ...newRepro, technician: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semen / Bull Name</label>
              <input className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="Bull ID or Semen Code" value={newRepro.semenName || ''} onChange={e => setNewRepro({ ...newRepro, semenName: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={() => setNewRepro({ ...newRepro, success: true })} className={`flex-1 py-4 rounded-2xl font-black text-[10px] tracking-widest ${newRepro.success === true ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>SUCCESS</button>
            <button type="button" onClick={() => setNewRepro({ ...newRepro, success: false })} className={`flex-1 py-4 rounded-2xl font-black text-[10px] tracking-widest ${newRepro.success === false ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>FAILED</button>
          </div>
          <textarea className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="Field notes..." value={newRepro.details || ''} onChange={e => setNewRepro({ ...newRepro, details: e.target.value })} />
          {newRepro.type === ReproEventType.CALVING && (
            <div className="space-y-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-200">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">🐄 Calf Details (auto-added to herd)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calf Tag *</label>
                  <input className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-black shadow-inner" placeholder="e.g. CALF-001" value={newRepro.offspringTag || ''} onChange={e => setNewRepro({ ...newRepro, offspringTag: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calf Sex</label>
                  <select className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-black shadow-inner" value={newRepro.offspringGender || 'Female'} onChange={e => setNewRepro({ ...newRepro, offspringGender: e.target.value as any })}>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Father (Bull / Semen ID)</label>
                <input className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-black shadow-inner" placeholder="Bull ID or Semen name" value={newRepro.bullId || ''} onChange={e => setNewRepro({ ...newRepro, bullId: e.target.value })} />
              </div>
            </div>
          )}
          <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest">
            {editingReproId ? "Update Record" : "Persist Record"}
          </button>
        </form>
      </FormModal>

      <FormModal title="Protocol Enrollment" isOpen={isEnrollmentFormOpen} onClose={() => setIsEnrollmentFormOpen(false)}>
        <form onSubmit={handleAddEnrollment} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tag or breed..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold shadow-inner"
                value={protocolAnimalSearch}
                onChange={(e) => setProtocolAnimalSearch(e.target.value)}
              />
            </div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enroll Animals (Select Multiple) *</label>
            <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-[1.5rem] p-4 bg-slate-50 space-y-1">
              {protocolEligibleAnimals.map(a => (
                <label key={a.id} className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer group ${newEnrollment.animalIds?.includes(a.id) ? 'bg-white shadow-sm' : 'hover:bg-slate-100/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${newEnrollment.animalIds?.includes(a.id) ? 'bg-amber-500 border-amber-500' : 'bg-white border-slate-200'}`}>
                      {newEnrollment.animalIds?.includes(a.id) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{a.tag}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{a.breed}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={newEnrollment.animalIds?.includes(a.id)}
                    onChange={(e) => {
                      const ids = newEnrollment.animalIds || [];
                      if (e.target.checked) {
                        setNewEnrollment({ ...newEnrollment, animalIds: [...ids, a.id] });
                      } else {
                        setNewEnrollment({ ...newEnrollment, animalIds: ids.filter(id => id !== a.id) });
                      }
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-4 p-5 bg-blue-50 rounded-2xl border border-blue-100">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Enrollment Target</label>
            <select
              className="w-full px-5 py-3.5 bg-white border-none rounded-2xl text-sm font-black shadow-sm"
              value={newEnrollment.id || ''}
              onChange={e => setNewEnrollment({ ...newEnrollment, id: e.target.value || undefined })}
            >
              <option value="">Create New Group (Auto-generate)</option>
              {enrollments.filter(en => en.status === 'Active').map(en => {
                const t = protocols.find(p => p.id === en.templateId);
                return (
                  <option key={en.id} value={en.id}>
                    Add to Group: {t?.name} (Started {en.startDate})
                  </option>
                );
              })}
            </select>
            <p className="text-[9px] text-blue-400 font-bold px-1">Adding to an existing group will apply its current progress to these cows.</p>
          </div>

          <select required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newEnrollment.templateId || ''} onChange={e => setNewEnrollment({ ...newEnrollment, templateId: e.target.value })}>
            <option value="">Select Protocol Template...</option>
            {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newEnrollment.startDate || ''} onChange={e => setNewEnrollment({ ...newEnrollment, startDate: e.target.value })} />
          <button type="submit" disabled={!newEnrollment.animalIds?.length || !newEnrollment.templateId} className="w-full py-5 bg-amber-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-100 disabled:opacity-50 transition-all">
            {newEnrollment.id ? 'Add Cows to Existing Group' : 'Authorize New Batch Start'}
          </button>
        </form>
      </FormModal>

      <FormModal title="Create Manual Protocol" isOpen={isTemplateFormOpen} onClose={() => setIsTemplateFormOpen(false)}>
        <form onSubmit={handleAddTemplate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Name *</label>
            <input required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="e.g. My Custom Heat Synch" value={newTemplate.name || ''} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workflow Steps</label>
            <button type="button" onClick={() => setNewTemplate({ ...newTemplate, steps: [...(newTemplate.steps || []), { dayOffset: 0, action: '', isAI: false, time: '08:00' }] })} className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:underline mb-2">
              <Plus className="w-3 h-3" /> Add Step
            </button>
            <div className="space-y-3">
              {newTemplate.steps?.map((step, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative group">
                  <button type="button" onClick={() => setNewTemplate({ ...newTemplate, steps: newTemplate.steps?.filter((_, i) => i !== idx) })} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" required placeholder="Day" className="px-3 py-2 bg-white rounded-lg text-xs font-bold border border-slate-100" value={step.dayOffset} onChange={e => {
                      const steps = [...(newTemplate.steps || [])];
                      steps[idx].dayOffset = parseInt(e.target.value) || 0;
                      setNewTemplate({ ...newTemplate, steps });
                    }} />
                    <input type="time" required className="px-3 py-2 bg-white rounded-lg text-xs font-bold border border-slate-100" value={step.time || '08:00'} onChange={e => {
                      const steps = [...(newTemplate.steps || [])];
                      steps[idx].time = e.target.value;
                      setNewTemplate({ ...newTemplate, steps });
                    }} />
                  </div>
                  <input required placeholder="Action (e.g. GnRH Injection)" className="w-full px-3 py-2 bg-white rounded-lg text-xs font-bold border border-slate-100" value={step.action} onChange={e => {
                    const steps = [...(newTemplate.steps || [])];
                    steps[idx].action = e.target.value;
                    setNewTemplate({ ...newTemplate, steps });
                  }} />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={step.isAI} onChange={e => {
                      const steps = [...(newTemplate.steps || [])];
                      steps[idx].isAI = e.target.checked;
                      setNewTemplate({ ...newTemplate, steps });
                    }} />
                    <span className="text-[10px] font-black text-slate-500 uppercase">Triggers Insemination Log</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100">
            Save Protocol Template
          </button>
        </form>
      </FormModal>

      
      <FormModal title={editingHealthId ? "Edit Clinical Record" : "Clinical Discovery & Treatments"} isOpen={isHealthFormOpen} onClose={() => { setIsHealthFormOpen(false); setHealthAnimalSearch(''); setSelectedMultipleAnimals([]); }}>
        <form onSubmit={handleAddHealth} className="space-y-6">
          {/* Patient Animal Selector: Single or Multiple */}
          {!editingHealthId && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Patient Grouping Selection</label>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                <button
                  type="button"
                  onClick={() => setTreatmentAnimalType('single')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    treatmentAnimalType === 'single'
                      ? 'bg-white text-rose-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Single Animal
                </button>
                <button
                  type="button"
                  onClick={() => setTreatmentAnimalType('multiple')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    treatmentAnimalType === 'multiple'
                      ? 'bg-white text-rose-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Multiple Animals (Flock)
                </button>
              </div>
            </div>
          )}

          {treatmentAnimalType === 'single' ? (
            /* Patient Tag Searchable Autocomplete (Single) */
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Patient Cow Tag *</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required={!newHealth.animalId && treatmentAnimalType === 'single'}
                  placeholder="Search and select patient..."
                  className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
                  value={healthAnimalSearch}
                  onChange={e => { setHealthAnimalSearch(e.target.value); setHealthAnimalDropdown(true); if (!e.target.value) setNewHealth({ ...newHealth, animalId: '' }); }}
                  onFocus={() => setHealthAnimalDropdown(true)}
                  disabled={!!editingHealthId}
                />
                {newHealth.animalId && <CheckCircle2 className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />}
              </div>
              {healthAnimalDropdown && healthAnimalSearch && !editingHealthId && (
                <div className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {animals.filter(a => a.tag.toLowerCase().includes(healthAnimalSearch.toLowerCase()) || (a.name && a.name.toLowerCase().includes(healthAnimalSearch.toLowerCase()))).slice(0, 8).map(a => (
                    <button key={a.id} type="button"
                      onClick={() => { setNewHealth({ ...newHealth, animalId: a.id }); setHealthAnimalSearch(a.tag); setHealthAnimalDropdown(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left ${newHealth.animalId === a.id ? 'bg-rose-50' : ''}`}
                    >
                      <div>
                        <p className="text-sm font-black text-slate-800">{a.tag}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{a.status} • {a.breed}</p>
                      </div>
                      {newHealth.animalId === a.id && <Check className="w-4 h-4 text-rose-600" />}
                    </button>
                  ))}
                  {animals.filter(a => a.tag.toLowerCase().includes(healthAnimalSearch.toLowerCase())).length === 0 && (
                    <p className="text-center py-4 text-xs text-slate-400 font-bold">No animals found</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Multiple Animals Selection Layout */
            <div className="space-y-3 p-4 bg-slate-50/50 border border-slate-100 rounded-[1.5rem] relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Multiple Animal Tags *</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type tag to add to flock..."
                  className="w-full pl-12 pr-5 py-3.5 bg-white border-none rounded-2xl text-sm font-black shadow-sm outline-none focus:ring-2 focus:ring-rose-500/20"
                  value={medicineSearchQuery}
                  onChange={e => { setMedicineSearchQuery(e.target.value); setActiveMedicineDropdownIdx(-99); }}
                  onFocus={() => setActiveMedicineDropdownIdx(-99)}
                />
              </div>

              {/* Match dropdown for flock selection */}
              {activeMedicineDropdownIdx === -99 && medicineSearchQuery && (
                <div className="absolute z-30 left-4 right-4 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {animals.filter(a => !selectedMultipleAnimals.includes(a.id) && (a.tag.toLowerCase().includes(medicineSearchQuery.toLowerCase()) || (a.name && a.name.toLowerCase().includes(medicineSearchQuery.toLowerCase())))).slice(0, 8).map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedMultipleAnimals(prev => [...prev, a.id]);
                        setMedicineSearchQuery('');
                        setActiveMedicineDropdownIdx(null);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
                    >
                      <div>
                        <p className="text-sm font-black text-slate-800">{a.tag}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{a.status} • {a.breed}</p>
                      </div>
                      <Plus className="w-4 h-4 text-emerald-600" />
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Pills */}
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedMultipleAnimals.map(id => {
                  const anim = animals.find(a => a.id === id);
                  return (
                    <div key={id} className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl text-xs font-black text-rose-700">
                      <span>{anim?.tag || 'Unk'}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMultipleAnimals(prev => prev.filter(x => x !== id))}
                        className="hover:text-rose-950"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {selectedMultipleAnimals.length === 0 && (
                  <p className="text-[10px] font-bold text-slate-400 italic py-1">No animals added to temporary flock yet. Type above to add.</p>
                )}
              </div>
              
              {/* Quick Select Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100/50">
                <button
                  type="button"
                  onClick={() => setSelectedMultipleAnimals(animals.map(a => a.id))}
                  className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg uppercase tracking-wider hover:bg-blue-100 transition-all"
                >
                  Select All Herd ({animals.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMultipleAnimals(animals.filter(a => a.status === AnimalStatus.SICK).map(a => a.id))}
                  className="text-[9px] font-black text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg uppercase tracking-wider hover:bg-rose-100 transition-all"
                >
                  Select All Sick ({animals.filter(a => a.status === AnimalStatus.SICK).length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMultipleAnimals([])}
                  className="text-[9px] font-black text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg uppercase tracking-wider hover:bg-slate-200 transition-all ml-auto"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <select className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newHealth.type || HealthEventType.ILLNESS} onChange={e => setNewHealth({ ...newHealth, type: e.target.value as any })}>
              {Object.values(HealthEventType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" value={newHealth.date || ''} onChange={e => setNewHealth({ ...newHealth, date: e.target.value })} />
          </div>
          <input className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" placeholder="Technician / Veterinarian" value={newHealth.technician || ''} onChange={e => setNewHealth({ ...newHealth, technician: e.target.value })} />
          
          {/* Treatments & Injections with search autocomplete */}
          <div className="space-y-3 p-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm relative">
            <div className="flex items-center justify-between pl-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Treatments & Medicine Inventory Usage</label>
              <button
                type="button"
                onClick={() => {
                  const currentTreatments = newHealth.treatments || [];
                  setNewHealth({ ...newHealth, treatments: [...currentTreatments, { name: '', dose: '' }] });
                }}
                className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl uppercase tracking-widest hover:bg-blue-100 transition-colors"
              >
                + Add Medicine
              </button>
            </div>

            {(!newHealth.treatments || newHealth.treatments.length === 0) && (
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold shadow-inner" placeholder="Medication (Optional)" value={newHealth.medication || ''} onChange={e => setNewHealth({ ...newHealth, medication: e.target.value })} />
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold shadow-inner" placeholder="Dosage" value={newHealth.dosage || ''} onChange={e => setNewHealth({ ...newHealth, dosage: e.target.value })} />
              </div>
            )}

            {newHealth.treatments?.map((treatment: any, idx: number) => {
              const matchedMedicine = medicines.find(m => m.name.toLowerCase() === treatment.name.toLowerCase());
              const unitLabel = matchedMedicine?.unit || 'ml';
              const filteredMedicines = medicines.filter(m => m.name.toLowerCase().includes(treatment.name.toLowerCase()));

              return (
                <div key={idx} className="space-y-2 relative group p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                  <div className="flex gap-2 items-center">
                    {/* Medicine Autocomplete Selector */}
                    <div className="flex-1 relative">
                      <input
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold shadow-inner focus:ring-2 focus:ring-blue-500/20 outline-none"
                        placeholder="Search Medicine Inventory..."
                        value={treatment.name}
                        onChange={e => {
                          const t = [...(newHealth.treatments || [])];
                          t[idx].name = e.target.value;
                          setNewHealth({ ...newHealth, treatments: t });
                          setActiveMedicineDropdownIdx(idx);
                        }}
                        onFocus={() => setActiveMedicineDropdownIdx(idx)}
                      />
                      {activeMedicineDropdownIdx === idx && treatment.name && (
                        <div className="absolute z-30 top-full left-0 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                          {filteredMedicines.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                const t = [...(newHealth.treatments || [])];
                                t[idx].name = m.name;
                                // Auto suggested default dose if not set
                                if (!t[idx].dose) t[idx].dose = `5${m.unit}`;
                                setNewHealth({ ...newHealth, treatments: t });
                                setActiveMedicineDropdownIdx(null);
                              }}
                              className="w-full px-4 py-2 hover:bg-slate-50 transition-colors text-left text-xs font-black flex items-center justify-between"
                            >
                              <span>{m.name}</span>
                              <span className="text-[9px] text-slate-400 uppercase font-bold">
                                {m.packs} packs + {m.loose}{m.unit}
                              </span>
                            </button>
                          ))}
                          {filteredMedicines.length === 0 && (
                            <p className="p-3 text-center text-[10px] text-slate-400 font-bold">No registered medicines found</p>
                          )}
                        </div>
                      )}
                    </div>

                    <input
                      className="w-1/3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold shadow-inner focus:ring-2 focus:ring-blue-500/20 outline-none"
                      placeholder={`Dosage (e.g. 5${unitLabel})`}
                      value={treatment.dose}
                      onChange={e => {
                        const t = [...(newHealth.treatments || [])];
                        t[idx].dose = e.target.value;
                        setNewHealth({ ...newHealth, treatments: t });
                      }}
                    />

                    {(newHealth.treatments && newHealth.treatments.length > 1) && (
                      <button
                        type="button"
                        onClick={() => {
                          const t = [...(newHealth.treatments || [])];
                          t.splice(idx, 1);
                          setNewHealth({ ...newHealth, treatments: t });
                        }}
                        className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Quick Dose Buttons */}
                  <div className="flex gap-2 items-center pl-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Quick Dose:</span>
                    {[2, 5, 10].map(val => {
                      const quickDoseText = `${val}${unitLabel}`;
                      return (
                        <button
                          type="button"
                          key={val}
                          onClick={() => {
                            const t = [...(newHealth.treatments || [])];
                            t[idx].dose = quickDoseText;
                            setNewHealth({ ...newHealth, treatments: t });
                          }}
                          className="text-[9px] font-black px-2.5 py-1 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-slate-600 rounded-lg transition-all"
                        >
                          {quickDoseText}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <textarea className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner" rows={3} placeholder="Clinical symptoms..." value={newHealth.details || ''} onChange={e => setNewHealth({ ...newHealth, details: e.target.value })} />
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Treatment Duration (Days)</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 5 (for 5-day treatment reminders)"
              className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner"
              value={newHealth.treatmentDays || ''}
              onChange={e => setNewHealth({ ...newHealth, treatmentDays: e.target.value ? parseInt(e.target.value) : undefined })}
            />
            <p className="text-[10px] text-slate-400 font-bold px-1">Daily alerts will fire for each day of treatment</p>
          </div>
          <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl space-y-4">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">💉 Multi-Dose Protocol (Optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Number of Doses</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 3"
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-black shadow-inner"
                  value={newHealth.numberOfDoses || ''}
                  onChange={e => setNewHealth({ ...newHealth, numberOfDoses: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Days Between Doses</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 2"
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-black shadow-inner"
                  value={newHealth.daysGap || ''}
                  onChange={e => setNewHealth({ ...newHealth, daysGap: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
            </div>
            <p className="text-[9px] text-amber-600 font-bold">System will create dose reminder alerts automatically</p>
          </div>
          <button type="submit" className="w-full py-5 bg-rose-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-100">
            {editingHealthId ? "Save Changes" : "Save Clinical Record"}
          </button>
        </form>
      </FormModal>

      {/* Medicine FormModal */}
      <FormModal title={editingMedicineId ? "Edit Medicine Stock" : "Register New Medicine"} isOpen={isMedicineFormOpen} onClose={() => { setIsMedicineFormOpen(false); setEditingMedicineId(null); }}>
        <form onSubmit={handleAddMedicineSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Medicine Name *</label>
            <input
              required
              placeholder="e.g. Oxytetracycline LA"
              className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-rose-500/20"
              value={newMedicine.name || ''}
              onChange={e => setNewMedicine({ ...newMedicine, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category</label>
              <select
                className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner"
                value={newMedicine.category || 'Injection'}
                onChange={e => setNewMedicine({ ...newMedicine, category: e.target.value as any })}
              >
                <option value="Injection">💉 Injection</option>
                <option value="Liquid">🧴 Liquid</option>
                <option value="Powder">💊 Powder</option>
                <option value="Pill">💊 Pill</option>
                <option value="Topical">🧴 Topical</option>
                <option value="Other">📦 Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Measurement Unit</label>
              <select
                className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner"
                value={newMedicine.unit || 'ml'}
                onChange={e => setNewMedicine({ ...newMedicine, unit: e.target.value as any })}
              >
                <option value="ml">ml (Milliliters)</option>
                <option value="dose">dose (Doses)</option>
                <option value="g">g (Grams)</option>
                <option value="pill">pill (Pills)</option>
                <option value="bottle">bottle (Bottles)</option>
              </select>
            </div>
          </div>

          <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80 space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Configuration</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Unopened Packs</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold shadow-sm"
                  value={newMedicine.packs ?? 0}
                  onChange={e => setNewMedicine({ ...newMedicine, packs: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Capacity / Pack</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 100 ml"
                  className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold shadow-sm"
                  value={newMedicine.loosePerPack ?? 100}
                  onChange={e => setNewMedicine({ ...newMedicine, loosePerPack: parseInt(e.target.value) || 100 })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Loose Qty (Open Pack)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold shadow-sm"
                  value={newMedicine.loose ?? 0}
                  onChange={e => setNewMedicine({ ...newMedicine, loose: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <p className="text-[9px] text-slate-400 font-bold italic">
              Total stock: {((newMedicine.packs || 0) * (newMedicine.loosePerPack || 100)) + (newMedicine.loose || 0)} {newMedicine.unit || 'ml'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Min Stock Alert Level (Total Units)</label>
            <input
              type="number"
              min="0"
              placeholder="Warn me when stock falls below e.g. 50"
              className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner"
              value={newMedicine.minStockLevel ?? 50}
              onChange={e => setNewMedicine({ ...newMedicine, minStockLevel: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-[10px] text-slate-400 font-bold px-1">⚠️ Warning alerts will display if total inventory drops below this number.</p>
          </div>

          <button type="submit" className="w-full py-5 bg-rose-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-100">
            {editingMedicineId ? "Update Stock" : "Register Medicine"}
          </button>
        </form>
      </FormModal>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Confirm Delete</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 font-semibold leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDialog(d => ({ ...d, isOpen: false }))} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
                Cancel
              </button>
              <button onClick={confirmDialog.onConfirm} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pregnancy Check Modal */}
      {isPregnancyCheckModalOpen && pregnancyCheckTarget && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 bg-blue-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800">Pregnancy Check</h3>
                <p className="text-xs text-blue-600 font-black uppercase tracking-widest mt-1">{pregnancyCheckTarget.tag}</p>
              </div>
              <button onClick={() => setIsPregnancyCheckModalOpen(false)} className="p-3 hover:bg-blue-100 rounded-2xl transition-all">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm text-slate-600 font-semibold">Select the result of today's pregnancy examination:</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPregnancyCheckResult('Pregnant')}
                  className={`p-6 rounded-2xl border-2 font-black text-sm uppercase tracking-wider transition-all ${pregnancyCheckResult === 'Pregnant' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl shadow-emerald-100' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                    }`}
                >
                  ✓ Pregnant
                </button>
                <button
                  onClick={() => setPregnancyCheckResult('Non-Pregnant')}
                  className={`p-6 rounded-2xl border-2 font-black text-sm uppercase tracking-wider transition-all ${pregnancyCheckResult === 'Non-Pregnant' ? 'bg-rose-600 text-white border-rose-600 shadow-xl shadow-rose-100' : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
                    }`}
                >
                  ✗ Open
                </button>
              </div>
              <button
                onClick={handlePregnancyCheck}
                disabled={!pregnancyCheckResult}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-40"
              >
                Confirm &amp; Update Status
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sequential AI Step Workflow Modal */}
      {aiWorkflow && (() => {
        const enrollment = enrollments.find(e => e.id === aiWorkflow.groupId);
        const animalId = enrollment?.animalIds[aiWorkflow.currentAnimalIndex];
        const animal = animals.find(a => a.id === animalId);
        const progress = enrollment ? ((aiWorkflow.currentAnimalIndex + 1) / enrollment.animalIds.length) * 100 : 0;

        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8 bg-blue-600 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">AI Batch Processing 🚀</h3>
                  <p className="text-xs font-bold text-blue-100 uppercase tracking-widest">Recording Insemination Log • Step Sequence</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black">{aiWorkflow.currentAnimalIndex + 1} / {enrollment?.animalIds.length}</p>
                  <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Cows Remaining</p>
                </div>
              </div>

              <div className="w-full h-2 bg-blue-900/20">
                <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>

              <div className="p-10 space-y-8">
                <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <div className="w-20 h-20 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-100">
                    {animal?.tag.slice(-2)}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Subject</p>
                    <h4 className="text-3xl font-black text-slate-800 tracking-tighter">Cow {animal?.tag}</h4>
                    <p className="text-xs text-slate-500 font-bold uppercase">{animal?.breed} • {animal?.herd}</p>
                  </div>
                </div>

                <form onSubmit={handleAIStepSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Technician Name</label>
                      <input
                        type="text"
                        list="all-technicians"
                        required
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-600/20"
                        value={newRepro.technician || ''}
                        onChange={e => setNewRepro({ ...newRepro, technician: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Semen/Bull ID</label>
                      <input
                        type="text"
                        list="all-semen"
                        required
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-600/20"
                        value={newRepro.semenName || ''}
                        onChange={e => setNewRepro({ ...newRepro, semenName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Notes (Optional)</label>
                    <textarea
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-600/20 h-24"
                      placeholder="Add any observations..."
                      value={newRepro.details || ''}
                      onChange={e => setNewRepro({ ...newRepro, details: e.target.value })}
                    />
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setAiWorkflow(null)}
                      className="flex-1 px-8 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Cancel Sequence
                    </button>
                    <button
                      type="submit"
                      className="flex-[2] px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                    >
                      {aiWorkflow.currentAnimalIndex < enrollment!.animalIds.length - 1 ? 'Save & Next Cow →' : 'Complete Batch ✅'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 1. Date Checked Details Modal (The Cool Visual Feature) */}
      {selectedBadgeDate && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded-lg">
                  {getBadgeStyleForDate(selectedBadgeDate).badgeNum}
                </span>
                <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1">Checks on {formatDateReadable(selectedBadgeDate)}</h3>
              </div>
              <button onClick={() => setSelectedBadgeDate(null)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
              <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                <span className="text-xs font-bold text-slate-500">Total Checks: {(pdChecksByDate[selectedBadgeDate] || []).length}</span>
                <div className="flex gap-4 text-xs font-black">
                  <span className="text-emerald-700">🤰 Pregnant: {(pdChecksByDate[selectedBadgeDate] || []).filter(e => e.pregnancyResult === 'Pregnant').length}</span>
                  <span className="text-rose-700">❌ Open: {(pdChecksByDate[selectedBadgeDate] || []).filter(e => e.pregnancyResult !== 'Pregnant').length}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {(pdChecksByDate[selectedBadgeDate] || []).map((check) => {
                  const checkAnimal = animals.find(a => a.id === check.animalId);
                  const isPreg = check.pregnancyResult === 'Pregnant';
                  return (
                    <div key={check.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-sm font-black text-slate-800">Cow {checkAnimal?.tag || 'Unregistered'}</p>
                        <p className="text-xs text-slate-400 font-bold">{checkAnimal?.breed || 'Unknown Breed'} • {checkAnimal?.herd || 'Main Herd'}</p>
                        {check.details && <p className="text-[10px] text-slate-400 mt-1 italic font-medium">"{check.details}"</p>}
                      </div>
                      <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${
                        isPreg ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {isPreg ? '🤰 Pregnant' : '❌ Open'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedBadgeDate(null)}
                className="px-6 py-3 bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. New PD Check Modal (Today's Check) */}
      <FormModal title="🤰 New PD Check (Today)" isOpen={isNewPdFormOpen} onClose={() => setIsNewPdFormOpen(false)}>
        <form onSubmit={handleSaveNewPdCheck} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Animal Tag / ID</label>
            <input
              type="text"
              required
              placeholder="e.g., Cow_45, 101"
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-600/20"
              value={pdAnimalId}
              onChange={e => setPdAnimalId(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 px-2 font-bold">If this tag doesn't exist, we will automatically register them in the Main Herd.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Pregnancy Diagnosis Result</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPdResult('Pregnant')}
                className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 font-black text-sm uppercase tracking-wider transition-all gap-2 ${
                  pdResult === 'Pregnant' 
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-100/50' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                }`}
              >
                <span className="text-2xl">🤰</span>
                <span>Pregnant</span>
              </button>
              <button
                type="button"
                onClick={() => setPdResult('Open')}
                className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 font-black text-sm uppercase tracking-wider transition-all gap-2 ${
                  pdResult === 'Open' 
                    ? 'bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-100/50' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
                }`}
              >
                <span className="text-2xl">❌</span>
                <span>Open</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Diagnostic Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Ultrasound 45 days, twins"
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-600/20"
              value={pdNotes}
              onChange={e => setPdNotes(e.target.value)}
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={() => setIsNewPdFormOpen(false)}
              className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!pdAnimalId.trim() || !pdResult}
              className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 disabled:opacity-40"
            >
              Save Check
            </button>
          </div>
        </form>
      </FormModal>

      {/* 3. Add Old Check Modal (Forgot Feature) */}
      <FormModal title="📅 Add Old Check (Forgot Feature)" isOpen={isOldPdFormOpen} onClose={() => setIsOldPdFormOpen(false)}>
        <form onSubmit={handleSaveOldPdCheck} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Check Date</label>
            <input
              type="date"
              required
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-600/20"
              value={oldPdDate}
              onChange={e => setOldPdDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Animal Tag / ID</label>
            <input
              type="text"
              required
              placeholder="e.g., Cow_45"
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-600/20"
              value={oldPdAnimalId}
              onChange={e => setOldPdAnimalId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Pregnancy Diagnosis Result</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setOldPdResult('Pregnant')}
                className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 font-black text-sm uppercase tracking-wider transition-all gap-2 ${
                  oldPdResult === 'Pregnant' 
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-100/50' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                }`}
              >
                <span className="text-2xl">🤰</span>
                <span>Pregnant</span>
              </button>
              <button
                type="button"
                onClick={() => setOldPdResult('Open')}
                className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 font-black text-sm uppercase tracking-wider transition-all gap-2 ${
                  oldPdResult === 'Open' 
                    ? 'bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-100/50' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
                }`}
              >
                <span className="text-2xl">❌</span>
                <span>Open</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Diagnostic Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Forgotten check record"
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-600/20"
              value={oldPdNotes}
              onChange={e => setOldPdNotes(e.target.value)}
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={() => setIsOldPdFormOpen(false)}
              className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!oldPdAnimalId.trim() || !oldPdResult || !oldPdDate}
              className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-40"
            >
              Add Old Check
            </button>
          </div>
        </form>
      </FormModal>

      {/* 4. Multi-Enter Modal (Bulk Entry) */}
      <FormModal title="📥 Multi-Enter (Bulk Diagnosis)" isOpen={isMultiPdFormOpen} onClose={() => setIsMultiPdFormOpen(false)}>
        <form onSubmit={handleSaveMultiPdCheck} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Select Check Date</label>
            <input
              type="date"
              required
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-600/20"
              value={multiPdDate}
              onChange={e => setMultiPdDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Paste or Enter List (One Check per Line)</label>
            <textarea
              required
              placeholder="e.g.,&#10;Animal_101 Pregnant&#10;Animal_102 Open&#10;Animal_103 Pregnant&#10;Cow_45 Open"
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-600/20 h-40 font-mono"
              value={multiPdText}
              onChange={e => setMultiPdText(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 px-2 font-bold leading-relaxed">
              Format: Animal_ID [Pregnant/Open]. If an animal tag is not registered, we will automatically create it in the system.
            </p>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={() => setIsMultiPdFormOpen(false)}
              className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!multiPdText.trim() || !multiPdDate}
              className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-40"
            >
              Submit All Checks
            </button>
          </div>
        </form>
      </FormModal>

      {/* Floating Success Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-slate-900/95 text-white backdrop-blur-md px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 border border-slate-800">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <p className="text-xs font-black tracking-wide leading-none">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-inter">
        <Activity className="w-16 h-16 text-blue-600 animate-pulse mb-6" />
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Connecting...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-[url('https://images.unsplash.com/photo-1596700810165-22d71625d033?auto=format&fit=crop&q=80')] bg-cover bg-center font-inter">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
        <div className="relative z-10 bg-white w-full max-w-md p-10 rounded-[3rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-100">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter">Asad's<span className="text-blue-600">Farm</span></h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Management</p>
            </div>
          </div>

          <h2 className="text-2xl font-black text-slate-800 mb-6">{isLoginMode ? 'Welcome Back' : 'Create Account'}</h2>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl mb-6 text-sm font-bold border border-rose-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                placeholder="operative@farm.com"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="w-full py-4 mt-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all">
              {isLoginMode ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-bold text-slate-500">
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
              className="text-blue-600 hover:text-blue-700 underline underline-offset-4"
            >
              {isLoginMode ? 'Sign Up' : 'Log In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <MainApp user={user} onLogout={handleLogout} />
    </div>
  );
}
