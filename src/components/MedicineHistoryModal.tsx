import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  ShoppingCart, 
  Activity, 
  Calendar, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  FileDown, 
  Trash2, 
  Search, 
  TrendingUp, 
  Stethoscope, 
  Building2, 
  Tag, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft,
  Syringe,
  Pill,
  Droplets,
  Sparkles
} from 'lucide-react';
import { Medicine, MedicinePurchase, HealthEvent, Animal, FarmSettings } from '../types';
import { generateMedicineHistoryReport } from '../utils/pdfUtils';
import { dateUtils } from '../services/businessLogic';

interface MedicineHistoryModalProps {
  medicine: Medicine;
  allMedicines: Medicine[];
  purchases: MedicinePurchase[];
  healthEvents: HealthEvent[];
  animals: Animal[];
  settings?: FarmSettings;
  onClose: () => void;
  onAddPurchase: (purchase: MedicinePurchase, autoUpdateStock: boolean) => void;
  onDeletePurchase: (purchaseId: string) => void;
  onOpenTreatmentWithMedicine?: (medicineName: string) => void;
  onEditMedicineStock?: (medicine: Medicine) => void;
  onSelectAnimal?: (animal: Animal) => void;
}

type TabType = 'timeline' | 'purchases' | 'usage' | 'analytics';

export const MedicineHistoryModal: React.FC<MedicineHistoryModalProps> = ({
  medicine,
  purchases,
  healthEvents,
  animals,
  settings,
  onClose,
  onAddPurchase,
  onDeletePurchase,
  onOpenTreatmentWithMedicine,
  onEditMedicineStock,
  onSelectAnimal
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);

  // New purchase form state
  const [purchaseDate, setPurchaseDate] = useState(dateUtils.today());
  const [purchasePacks, setPurchasePacks] = useState<number | ''>(1);
  const [purchaseLoose, setPurchaseLoose] = useState<number | ''>(0);
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseBatch, setPurchaseBatch] = useState('');
  const [purchaseExpiry, setPurchaseExpiry] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseAutoUpdateStock, setPurchaseAutoUpdateStock] = useState(true);

  // Stock calculations
  const totalStock = (medicine.packs * medicine.loosePerPack) + medicine.loose;
  const isLowStock = totalStock < medicine.minStockLevel;

  // Filter purchases for this medicine (by id or normalized name)
  const medPurchases = useMemo(() => {
    return purchases
      .filter(p => p.medicineId === medicine.id || p.medicineName.toLowerCase() === medicine.name.toLowerCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, medicine]);

  // Extract usage from healthEvents where this medicine is used
  const medUsages = useMemo(() => {
    const usages: {
      id: string;
      healthEventId: string;
      date: string;
      animalId: string;
      animalTag: string;
      animalName: string;
      dose: string;
      type: string;
      details: string;
      technician: string;
      parsedDose: number;
    }[] = [];

    healthEvents.forEach(he => {
      const matchingTreatments = (he.treatments && he.treatments.length > 0)
        ? he.treatments.filter(t => t.name.toLowerCase() === medicine.name.toLowerCase())
        : (he.medication && he.medication.toLowerCase() === medicine.name.toLowerCase() 
            ? [{ name: he.medication, dose: he.dosage || '1 unit' }] 
            : []);

      if (matchingTreatments.length > 0) {
        const animal = animals.find(a => a.id === he.animalId);
        matchingTreatments.forEach((t, idx) => {
          const parsed = t.dose.match(/^([\d.]+)/);
          const num = parsed ? parseFloat(parsed[1]) : 1;
          usages.push({
            id: `${he.id}_${idx}`,
            healthEventId: he.id,
            date: he.date,
            animalId: he.animalId,
            animalTag: animal?.tag || 'Unknown',
            animalName: animal?.name || '',
            dose: t.dose || '1 dose',
            type: he.type,
            details: he.details || 'Clinical Administration',
            technician: he.technician || 'Staff',
            parsedDose: num
          });
        });
      }
    });

    return usages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [healthEvents, medicine, animals]);

  // Stats calculation
  const totalPurchasedPacks = medPurchases.reduce((acc, p) => acc + (p.packs || 0), 0);
  const totalPurchasedUnits = medPurchases.reduce((acc, p) => acc + (p.totalUnits || ((p.packs * medicine.loosePerPack) + (p.loose || 0))), 0);

  const totalUsedUnits = medUsages.reduce((acc, u) => acc + u.parsedDose, 0);
  const uniqueAnimalsTreated = new Set(medUsages.map(u => u.animalId)).size;

  // Last 30 days usage
  const thirtyDaysAgo = dateUtils.addDays(dateUtils.today(), -30);
  const usageLast30Days = medUsages
    .filter(u => u.date >= thirtyDaysAgo)
    .reduce((acc, u) => acc + u.parsedDose, 0);

  const estimatedDaysRemaining = usageLast30Days > 0 
    ? Math.round((totalStock / (usageLast30Days / 30))) 
    : 999;

  // Unified timeline items
  const timelineItems = useMemo(() => {
    const items: {
      id: string;
      type: 'purchase' | 'usage';
      date: string;
      title: string;
      subtitle: string;
      quantityText: string;
      isPositive: boolean;
      extraInfo?: string;
      metadata?: any;
    }[] = [];

    medPurchases.forEach(p => {
      const units = p.totalUnits || ((p.packs * medicine.loosePerPack) + (p.loose || 0));
      items.push({
        id: `p_${p.id}`,
        type: 'purchase',
        date: p.date,
        title: `Restock / Purchased (${p.packs} packs)`,
        subtitle: p.supplier ? `Supplier: ${p.supplier}` : 'Stock Inflow',
        quantityText: `+${units} ${medicine.unit}`,
        isPositive: true,
        extraInfo: p.batchNumber ? `Batch: ${p.batchNumber} | Exp: ${p.expiryDate || 'N/A'}` : (p.notes || undefined),
        metadata: p
      });
    });

    medUsages.forEach(u => {
      items.push({
        id: `u_${u.id}`,
        type: 'usage',
        date: u.date,
        title: `Administered to ${u.animalTag}${u.animalName ? ` (${u.animalName})` : ''}`,
        subtitle: `${u.type}: ${u.details}`,
        quantityText: `-${u.dose}`,
        isPositive: false,
        extraInfo: `By: ${u.technician}`,
        metadata: u
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [medPurchases, medUsages, medicine]);

  // Filtered lists based on search query
  const filteredTimeline = useMemo(() => {
    if (!searchQuery.trim()) return timelineItems;
    const q = searchQuery.toLowerCase();
    return timelineItems.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.subtitle.toLowerCase().includes(q) || 
      item.date.includes(q) ||
      (item.extraInfo && item.extraInfo.toLowerCase().includes(q))
    );
  }, [timelineItems, searchQuery]);

  const filteredPurchases = useMemo(() => {
    if (!searchQuery.trim()) return medPurchases;
    const q = searchQuery.toLowerCase();
    return medPurchases.filter(p => 
      p.date.includes(q) ||
      (p.supplier && p.supplier.toLowerCase().includes(q)) ||
      (p.batchNumber && p.batchNumber.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  }, [medPurchases, searchQuery]);

  const filteredUsages = useMemo(() => {
    if (!searchQuery.trim()) return medUsages;
    const q = searchQuery.toLowerCase();
    return medUsages.filter(u => 
      u.animalTag.toLowerCase().includes(q) || 
      u.animalName.toLowerCase().includes(q) || 
      u.date.includes(q) ||
      u.type.toLowerCase().includes(q) || 
      u.details.toLowerCase().includes(q) || 
      u.technician.toLowerCase().includes(q)
    );
  }, [medUsages, searchQuery]);

  // Handle Save Purchase
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const packsNum = Number(purchasePacks) || 0;
    const looseNum = Number(purchaseLoose) || 0;
    const totalUnitsCalculated = (packsNum * medicine.loosePerPack) + looseNum;

    if (packsNum <= 0 && looseNum <= 0) {
      alert('Please enter at least 1 pack or loose units for the purchase quantity.');
      return;
    }

    const newPurchase: MedicinePurchase = {
      id: Math.random().toString(36).substr(2, 9),
      medicineId: medicine.id,
      medicineName: medicine.name,
      date: purchaseDate || dateUtils.today(),
      packs: packsNum,
      loose: looseNum,
      totalUnits: totalUnitsCalculated,
      supplier: purchaseSupplier.trim() || undefined,
      batchNumber: purchaseBatch.trim() || undefined,
      expiryDate: purchaseExpiry || undefined,
      notes: purchaseNotes.trim() || undefined,
      recordedBy: 'Asad Ali'
    };

    onAddPurchase(newPurchase, purchaseAutoUpdateStock);
    
    // Reset form
    setPurchasePacks(1);
    setPurchaseLoose(0);
    setPurchaseSupplier('');
    setPurchaseBatch('');
    setPurchaseExpiry('');
    setPurchaseNotes('');
    setIsAddPurchaseOpen(false);
  };

  // Category Icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Injection':
        return <Syringe className="w-5 h-5 text-indigo-600" />;
      case 'Liquid':
        return <Droplets className="w-5 h-5 text-blue-600" />;
      case 'Powder':
        return <Package className="w-5 h-5 text-amber-600" />;
      default:
        return <Pill className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div id="medicine-history-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 overflow-y-auto">
      <div 
        id="medicine-history-modal-container" 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div id="medicine-history-header" className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-6 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-inner flex-shrink-0">
                {getCategoryIcon(medicine.category)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{medicine.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/20">
                    {medicine.category}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                    isLowStock 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {isLowStock ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    {isLowStock ? 'Low Stock' : 'Stock Healthy'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                  <span>Standard Unit: <strong className="text-white">{medicine.unit}</strong></span>
                  <span className="text-slate-500">•</span>
                  <span>Pack Size: <strong className="text-white">{medicine.loosePerPack} {medicine.unit}/pack</strong></span>
                  <span className="text-slate-500">•</span>
                  <span>Min Alert Threshold: <strong className="text-white">{medicine.minStockLevel} {medicine.unit}</strong></span>
                </p>
              </div>
            </div>

            {/* Quick Actions & Close */}
            <div className="flex items-center gap-2">
              <button
                id="btn-export-medicine-history-pdf"
                onClick={() => generateMedicineHistoryReport(medicine, medPurchases, medUsages, settings)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
                title="Download complete audit trail PDF"
              >
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span>Export PDF</span>
              </button>
              <button
                id="btn-close-medicine-history-modal"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
              <span className="text-[11px] text-slate-400 font-medium block">Current Inventory</span>
              <div className="text-base sm:text-lg font-bold text-white mt-0.5">
                {medicine.packs} <span className="text-xs text-slate-300 font-normal">packs</span> + {medicine.loose} <span className="text-xs text-slate-300 font-normal">{medicine.unit}</span>
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">= {totalStock} {medicine.unit} total</span>
            </div>

            <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
              <span className="text-[11px] text-slate-400 font-medium block">Lifetime Restocked</span>
              <div className="text-base sm:text-lg font-bold text-white mt-0.5">
                {totalPurchasedPacks} <span className="text-xs text-slate-300 font-normal">packs</span>
              </div>
              <span className="text-[11px] text-indigo-300 font-medium">{medPurchases.length} restock batches (+{totalPurchasedUnits} {medicine.unit})</span>
            </div>

            <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
              <span className="text-[11px] text-slate-400 font-medium block">Total Administered</span>
              <div className="text-base sm:text-lg font-bold text-white mt-0.5">
                {totalUsedUnits} <span className="text-xs text-slate-300 font-normal">{medicine.unit}</span>
              </div>
              <span className="text-[11px] text-blue-300 font-medium">{medUsages.length} treatments ({uniqueAnimalsTreated} cows)</span>
            </div>

            <div className="bg-white/5 backdrop-blur-xs rounded-xl p-2.5 border border-white/10">
              <span className="text-[11px] text-slate-400 font-medium block">Est. Stock Coverage</span>
              <div className="text-base sm:text-lg font-bold text-white mt-0.5">
                {estimatedDaysRemaining === 999 ? '∞' : `${estimatedDaysRemaining} days`}
              </div>
              <span className="text-[11px] text-amber-300 font-medium">30D Usage: {usageLast30Days} {medicine.unit}</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div id="medicine-history-nav" className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              id="tab-medicine-timeline"
              onClick={() => setActiveTab('timeline')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'timeline'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Full Timeline</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'timeline' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {timelineItems.length}
              </span>
            </button>

            <button
              id="tab-medicine-purchases"
              onClick={() => setActiveTab('purchases')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'purchases'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Purchases & Restocks</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'purchases' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
                {medPurchases.length}
              </span>
            </button>

            <button
              id="tab-medicine-usage"
              onClick={() => setActiveTab('usage')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'usage'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Clinical Usage</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'usage' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'}`}>
                {medUsages.length}
              </span>
            </button>

            <button
              id="tab-medicine-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Stock & Audit Analytics</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              id="btn-open-add-purchase-form"
              onClick={() => {
                setActiveTab('purchases');
                setIsAddPurchaseOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Log Purchase</span>
            </button>

            {onOpenTreatmentWithMedicine && (
              <button
                id="btn-administer-medicine"
                onClick={() => {
                  onClose();
                  onOpenTreatmentWithMedicine(medicine.name);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Administer Dose</span>
              </button>
            )}

            <button
              id="btn-export-medicine-pdf-mobile"
              onClick={() => generateMedicineHistoryReport(medicine, medPurchases, medUsages, settings)}
              className="sm:hidden p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              title="Export PDF"
            >
              <FileDown className="w-4 h-4 text-emerald-600" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div id="medicine-history-search" className="px-4 sm:px-6 py-2.5 bg-white border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-medicine-history-search"
              type="text"
              placeholder="Search by date, animal tag, supplier, diagnosis, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
            />
          </div>
          {searchQuery && (
            <button
              id="btn-clear-medicine-history-search"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Modal Body Content */}
        <div id="medicine-history-body" className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
          
          {/* TAB 1: FULL TIMELINE */}
          {activeTab === 'timeline' && (
            <div id="tab-timeline-content" className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Chronological Inventory Activity Stream
                </h3>
                <span className="text-xs text-slate-500">
                  Showing {filteredTimeline.length} events (Purchases + Administrations)
                </span>
              </div>

              {filteredTimeline.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No activity records found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {searchQuery ? 'Try clearing your search query.' : 'Log a purchase or clinical treatment to populate this history.'}
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 sm:pl-8 space-y-3.5 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {filteredTimeline.map((item) => {
                    const isPurchase = item.type === 'purchase';
                    return (
                      <div 
                        key={item.id}
                        className="relative bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:shadow-md transition-all group"
                      >
                        {/* Timeline Node Icon */}
                        <div className={`absolute -left-6 sm:-left-8 top-4 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                          isPurchase ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                        }`}>
                          {isPurchase ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                                isPurchase 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {isPurchase ? 'Stock Inflow / Purchase' : 'Clinical Treatment'}
                              </span>
                              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {item.date}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 mt-1.5">{item.title}</h4>
                            <p className="text-xs text-slate-600 mt-0.5">{item.subtitle}</p>

                            {item.extraInfo && (
                              <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded-md px-2.5 py-1 inline-block border border-slate-150">
                                {item.extraInfo}
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            <span className={`text-base font-extrabold px-3 py-1 rounded-lg inline-block ${
                              item.isPositive 
                                ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200' 
                                : 'bg-rose-100/80 text-rose-800 border border-rose-200'
                            }`}>
                              {item.quantityText}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PURCHASES & RESTOCKS */}
          {activeTab === 'purchases' && (
            <div id="tab-purchases-content" className="space-y-4">
              
              {/* Add Purchase / Restock Form Collapsible */}
              {isAddPurchaseOpen ? (
                <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-5 shadow-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-200">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-emerald-700" />
                      <h3 className="text-base font-bold text-emerald-950">Record New Medicine Purchase / Restock</h3>
                    </div>
                    <button
                      onClick={() => setIsAddPurchaseOpen(false)}
                      className="p-1 rounded-md text-emerald-700 hover:bg-emerald-200/60 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSavePurchase} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Date *</label>
                        <input
                          type="date"
                          required
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Quantity (Packs/Bottles) *</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          placeholder="e.g. 3"
                          value={purchasePacks}
                          onChange={(e) => setPurchasePacks(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                        <span className="text-[11px] text-slate-500 mt-0.5 block">
                          = {Number(purchasePacks || 0) * medicine.loosePerPack} {medicine.unit} ({medicine.loosePerPack} {medicine.unit}/pack)
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Loose Units (Optional)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="e.g. 0"
                          value={purchaseLoose}
                          onChange={(e) => setPurchaseLoose(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                        <span className="text-[11px] text-slate-500 mt-0.5 block">
                          Total Added: {(Number(purchasePacks || 0) * medicine.loosePerPack) + Number(purchaseLoose || 0)} {medicine.unit}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Supplier / Pharmacy</label>
                        <input
                          type="text"
                          placeholder="e.g. VetPharm Supplies Ltd."
                          value={purchaseSupplier}
                          onChange={(e) => setPurchaseSupplier(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Batch / Lot #</label>
                        <input
                          type="text"
                          placeholder="e.g. BATCH-9920"
                          value={purchaseBatch}
                          onChange={(e) => setPurchaseBatch(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={purchaseExpiry}
                          onChange={(e) => setPurchaseExpiry(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Delivery Ref</label>
                        <input
                          type="text"
                          placeholder="e.g. Order #8841, stored in refrigerated dispensary"
                          value={purchaseNotes}
                          onChange={(e) => setPurchaseNotes(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={purchaseAutoUpdateStock}
                          onChange={(e) => setPurchaseAutoUpdateStock(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Automatically add this quantity to active inventory stock ({medicine.packs} packs ➔ {medicine.packs + Number(purchasePacks || 0)} packs)</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddPurchaseOpen(false)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Save Purchase Record</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Purchase & Restock Ledger</h3>
                    <p className="text-xs text-slate-500">Every restock batch, supplier source, lot number, and volume acquired</p>
                  </div>
                  <button
                    onClick={() => setIsAddPurchaseOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Log New Purchase</span>
                  </button>
                </div>
              )}

              {/* Purchase Records Table / Cards */}
              {filteredPurchases.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No purchase records registered yet</p>
                  <p className="text-xs text-slate-500 mt-1">Click the "+ Log New Purchase" button above to log your first order.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredPurchases.map((purchase) => {
                    const units = purchase.totalUnits || ((purchase.packs * medicine.loosePerPack) + (purchase.loose || 0));
                    return (
                      <div 
                        key={purchase.id}
                        className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex items-start justify-between gap-4 flex-wrap"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ShoppingCart className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900">
                                {purchase.packs} Pack{purchase.packs !== 1 ? 's' : ''} {purchase.loose > 0 ? `+ ${purchase.loose} ${medicine.unit}` : ''}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                +{units} {medicine.unit}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                <Calendar className="w-3 h-3" />
                                {purchase.date}
                              </span>
                            </div>

                            <div className="text-xs text-slate-600 mt-1.5 flex items-center gap-3 flex-wrap">
                              {purchase.supplier && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                  Supplier: <strong className="text-slate-800">{purchase.supplier}</strong>
                                </span>
                              )}
                              {purchase.batchNumber && (
                                <span className="flex items-center gap-1">
                                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                                  Batch: <strong className="text-slate-800">{purchase.batchNumber}</strong>
                                </span>
                              )}
                              {purchase.expiryDate && (
                                <span className="flex items-center gap-1 text-amber-700 font-medium">
                                  <Clock className="w-3.5 h-3.5" />
                                  Exp: {purchase.expiryDate}
                                </span>
                              )}
                            </div>

                            {purchase.notes && (
                              <p className="text-xs text-slate-500 mt-1.5 italic bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                Note: {purchase.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-auto">
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to remove this purchase record?')) {
                                onDeletePurchase(purchase.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                            title="Delete Purchase Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLINICAL USAGE */}
          {activeTab === 'usage' && (
            <div id="tab-usage-content" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Animal Clinical Administration Log</h3>
                  <p className="text-xs text-slate-500">Every treatment dose, diagnosed patient cow, and administering practitioner</p>
                </div>
                {onOpenTreatmentWithMedicine && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenTreatmentWithMedicine(medicine.name);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>+ Log New Treatment</span>
                  </button>
                )}
              </div>

              {filteredUsages.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No clinical treatments logged for this medicine</p>
                  <p className="text-xs text-slate-500 mt-1">When treatments or health events are recorded using this medication, they will appear here automatically.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredUsages.map((usage) => {
                    const animal = animals.find(a => a.id === usage.animalId);
                    return (
                      <div 
                        key={usage.id}
                        className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex items-start justify-between gap-4 flex-wrap"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Syringe className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Cow Tag */}
                              <button
                                onClick={() => {
                                  if (animal && onSelectAnimal) {
                                    onClose();
                                    onSelectAnimal(animal);
                                  }
                                }}
                                className="font-bold text-sm text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>Cow {usage.animalTag}</span>
                                {usage.animalName && <span className="text-slate-600 font-normal">({usage.animalName})</span>}
                              </button>

                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                {usage.type}
                              </span>

                              <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                <Calendar className="w-3 h-3" />
                                {usage.date}
                              </span>
                            </div>

                            <p className="text-xs font-medium text-slate-700 mt-1.5">
                              {usage.details}
                            </p>

                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                              <span>Administered by: <strong className="text-slate-700">{usage.technician}</strong></span>
                              {animal?.breed && <span>Breed: {animal.breed}</span>}
                              {animal?.herd && <span>Herd: {animal.herd}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right ml-auto">
                          <span className="text-sm font-extrabold px-3 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 inline-block">
                            -{usage.dose}
                          </span>
                          <span className="block text-[11px] text-slate-400 mt-1">Dose Administered</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ANALYTICS & AUDIT */}
          {activeTab === 'analytics' && (
            <div id="tab-analytics-content" className="space-y-4">
              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">Stock Inflow vs Outflow</span>
                    <Package className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    +{totalPurchasedUnits} <span className="text-xs text-slate-400 font-normal">in</span> / -{totalUsedUnits} <span className="text-xs text-slate-400 font-normal">out</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${totalPurchasedUnits > 0 ? Math.min(100, Math.round((totalStock / totalPurchasedUnits) * 100)) : 100}%` }}
                    />
                    <div 
                      className="bg-rose-400 h-full" 
                      style={{ width: `${totalPurchasedUnits > 0 ? Math.min(100, Math.round((totalUsedUnits / totalPurchasedUnits) * 100)) : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-medium">
                    <span>In Stock: {totalStock} {medicine.unit}</span>
                    <span>Used: {totalUsedUnits} {medicine.unit}</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">Stock Turnover Rate</span>
                    <Activity className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {totalPurchasedUnits > 0 ? `${((totalUsedUnits / totalPurchasedUnits) * 100).toFixed(0)}%` : '0%'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Total Volume Utilized / Total Volume Acquired across {medPurchases.length} restocks
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold">Herd Exposure</span>
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {uniqueAnimalsTreated} cows treated
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {medUsages.length} clinical administration events recorded
                  </p>
                </div>
              </div>

              {/* Treated Cows Breakdown */}
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  Animal Treatment Frequency
                </h4>
                
                {medUsages.length === 0 ? (
                  <p className="text-xs text-slate-500">No animals have been treated with this medicine yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {Array.from(new Set(medUsages.map(u => u.animalId))).map(animalId => {
                      const animal = animals.find(a => a.id === animalId);
                      const animalUsages = medUsages.filter(u => u.animalId === animalId);
                      const totalAnimalDose = animalUsages.reduce((sum, u) => sum + u.parsedDose, 0);

                      return (
                        <div key={animalId} className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                          <div>
                            <span className="text-xs font-bold text-slate-900">Cow {animal?.tag || 'Unknown'}</span>
                            {animal?.name && <span className="text-xs text-slate-500 ml-1.5">({animal.name})</span>}
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {animalUsages.length} treatment session(s) • Last: {animalUsages[0]?.date}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                              Total: {totalAnimalDose} {medicine.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Audit Recommendation */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-150 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700">
                  <strong className="text-indigo-950 font-bold block mb-0.5">Audit & Stock Integrity Status</strong>
                  This medicine's live ledger tracks {medPurchases.length} restock acquisitions (+{totalPurchasedUnits} {medicine.unit}) and {medUsages.length} patient administrations (-{totalUsedUnits} {medicine.unit}). Current active stock is verified at {totalStock} {medicine.unit}.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div id="medicine-history-footer" className="bg-white border-t border-slate-200 px-5 py-3.5 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" />
            <span>ID: <code className="text-slate-700 font-mono">{medicine.id}</code></span>
          </div>

          <div className="flex items-center gap-2">
            {onEditMedicineStock && (
              <button
                id="btn-edit-medicine-from-modal"
                onClick={() => {
                  onClose();
                  onEditMedicineStock(medicine);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Edit Stock Properties
              </button>
            )}
            <button
              id="btn-close-modal-bottom"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
