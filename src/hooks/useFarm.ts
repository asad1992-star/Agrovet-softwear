
import { useState, useEffect, useMemo, useRef } from 'react';
import { Animal, ReproductionEvent, HealthEvent, Alert, FarmSettings, ProtocolEnrollment, ProtocolTemplate, ReproEventType, AnimalStatus, Medicine, MedicinePurchase } from '../types';
import { storageService, DEFAULT_SETTINGS } from '../services/storage';
import { 
  computeAnimalStatus, 
  generateAlerts, 
  dateUtils,
  isYoungStockHerdGroup,
  isCalfHerdGroup,
  isYoungStockAnimal,
  isCalfAnimal,
  isBreedingEligibleAnimal
} from '../services/businessLogic';
import { PREDEFINED_PROTOCOLS } from '../data';

export const useFarm = () => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [reproEvents, setReproEvents] = useState<ReproductionEvent[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [purchases, setPurchases] = useState<MedicinePurchase[]>([]);
  const [enrollments, setEnrollments] = useState<ProtocolEnrollment[]>([]);
  const [customProtocols, setCustomProtocols] = useState<ProtocolTemplate[]>([]);
  const [settings, setSettings] = useState<FarmSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const isInitialMount = useRef(true);

  const allTemplates = useMemo(() => [...PREDEFINED_PROTOCOLS, ...customProtocols], [customProtocols]);

  // Initialize
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const fetchedAnimals = await storageService.getAnimals();
        const fetchedReproEvents = await storageService.getReproEvents();
        const fetchedHealthEvents = await storageService.getHealthEvents();
        const fetchedMedicines = await storageService.getMedicines();
        const fetchedPurchases = await storageService.getPurchases();
        const fetchedEnrollments = await storageService.getEnrollments();
        const fetchedCustomProtocols = await storageService.getCustomProtocols();
        const fetchedSettings = await storageService.getSettings();

        setAnimals(fetchedAnimals);
        setReproEvents(fetchedReproEvents);
        setHealthEvents(fetchedHealthEvents);
        setMedicines(fetchedMedicines);
        setPurchases(fetchedPurchases);
        setEnrollments(fetchedEnrollments);
        setCustomProtocols(fetchedCustomProtocols);
        setSettings(fetchedSettings);
      } catch (error) {
        console.error("Error loading farm data", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save on change
  useEffect(() => {
    if (!loading && animals.length) storageService.saveAnimals(animals);
  }, [animals, loading]);

  useEffect(() => {
    if (!loading && reproEvents.length) storageService.saveReproEvents(reproEvents);
  }, [reproEvents, loading]);

  useEffect(() => {
    if (!loading && healthEvents.length) storageService.saveHealthEvents(healthEvents);
  }, [healthEvents, loading]);

  useEffect(() => {
    if (!loading && medicines.length) storageService.saveMedicines(medicines);
  }, [medicines, loading]);

  useEffect(() => {
    if (!loading && purchases.length) storageService.savePurchases(purchases);
  }, [purchases, loading]);

  useEffect(() => {
    if (!loading) storageService.saveEnrollments(enrollments);
  }, [enrollments, loading]);

  useEffect(() => {
    if (!loading) storageService.saveCustomProtocols(customProtocols);
  }, [customProtocols, loading]);

  useEffect(() => {
    if (!loading) storageService.saveSettings(settings);
  }, [settings, loading]);

  // Derived Data
  const animalsWithStatus = useMemo(() => {
    return animals.map(a => ({
      ...a,
      ...computeAnimalStatus(a, reproEvents, healthEvents, enrollments, settings)
    }));
  }, [animals, reproEvents, healthEvents, enrollments, settings]);

  const alerts = useMemo(() => {
    return generateAlerts(animals, reproEvents, healthEvents, enrollments, allTemplates, settings);
  }, [animals, reproEvents, healthEvents, enrollments, allTemplates, settings]);

  const stats = useMemo(() => {
    const statuses = animalsWithStatus.map(a => a.status);
    const today = dateUtils.today();
    
    // Conception Rate Calculation
    // We need "Total Bred Animals" vs "Pregnant Animals"
    // For simplicity, let's count animals that have at least one insemination record since their last calving (or ever if no calving)
    const bredAnimalIds = new Set(reproEvents.filter(e => e.type === ReproEventType.INSEMINATION).map(e => e.animalId));
    const totalBred = bredAnimalIds.size;
    const pregnant = statuses.filter(s => s === AnimalStatus.PREGNANT || s === AnimalStatus.CLOSEUP).length;
    const conceptionRate = totalBred > 0 ? Math.round((pregnant / totalBred) * 100) : 0;

    // Repeat Breeders: Animals with > 2 inseminations in the current cycle
    const repeatBreeders = animalsWithStatus.filter(a => {
      const insemCount = reproEvents.filter(e => e.animalId === a.id && e.type === ReproEventType.INSEMINATION).length;
      return insemCount >= 3 && a.status !== AnimalStatus.PREGNANT;
    }).length;

    // Heat Due & Calving Due from alerts
    const heatDueCount = alerts.filter(al => al.title.includes('Heat Check')).length;
    const calvingDueCount = alerts.filter(al => al.title.includes('Calving') && !al.title.includes('OVERDUE')).length;
    const overdueCalvingCount = alerts.filter(al => al.title.includes('Calving OVERDUE')).length;
    
    // Recently Treated (last 7 days)
    const sevenDaysAgo = dateUtils.addDays(today, -7);
    const recentlyTreated = Array.from(new Set(healthEvents.filter(e => e.date >= sevenDaysAgo).map(e => e.animalId))).length;

    return {
      total: animals.filter(a => !isCalfAnimal(a)).length,
      pregnant,
      // Open animals: Exclude Young Stock (growing heifers, suckling, post-weaning) and calves
      open: animalsWithStatus.filter(a => isBreedingEligibleAnimal(a) && (a.status === AnimalStatus.ACTIVE || a.status === AnimalStatus.IN_PROTOCOL)).length,
      youngStock: animals.filter(a => isYoungStockAnimal(a)).length,
      repeatBreeders,
      inHeat: animalsWithStatus.filter(a => isBreedingEligibleAnimal(a) && a.status === AnimalStatus.ACTIVE).length,
      heatDue: heatDueCount,
      dry: statuses.filter(s => s === AnimalStatus.DRY).length,
      calvingDue: calvingDueCount,
      overdueCalving: overdueCalvingCount,
      sick: statuses.filter(s => s === AnimalStatus.SICK).length,
      recentlyTreated,
      conceptionRate,
      active: animalsWithStatus.filter(a => isBreedingEligibleAnimal(a) && a.status === AnimalStatus.ACTIVE).length,
      calves: animals.filter(a => isCalfAnimal(a)).length,
      inProtocol: statuses.filter(s => s === AnimalStatus.IN_PROTOCOL).length,
      inseminated: statuses.filter(s => s === AnimalStatus.INSEMINATED).length
    };
  }, [animalsWithStatus, animals, reproEvents, healthEvents, alerts]);

  // Actions
  const addAnimal = (a: Animal) => setAnimals(prev => [a, ...prev]);
  const updateAnimal = (updated: Animal) => setAnimals(prev => prev.map(a => a.id === updated.id ? updated : a));
  const updateAnimalsHerd = (animalIds: string[], targetHerd: string) => {
    const isTargetYoungStock = isYoungStockHerdGroup(targetHerd);
    const isTargetCalf = isCalfHerdGroup(targetHerd);

    setAnimals(prev => prev.map(a => {
      if (!animalIds.includes(a.id)) return a;
      let newIsCalf = a.isCalf;
      if (isTargetYoungStock) {
        newIsCalf = false;
      } else if (isTargetCalf) {
        newIsCalf = true;
      } else if (a.isCalf) {
        // If moved to general adult herd, remove calf flag
        newIsCalf = false;
      }
      return { ...a, herd: targetHerd, isCalf: newIsCalf };
    }));
  };
  const deleteAnimal = (id: string) => setAnimals(prev => prev.filter(a => a.id !== id));

  const addReproEvent = (e: ReproductionEvent) => {
    if (e.type === ReproEventType.INSEMINATION && !e.protocolId) {
      setEnrollments(prev => prev.filter(enrollment => enrollment.animalId !== e.animalId || enrollment.status !== 'Active'));
    }
    setReproEvents(prev => [e, ...prev]);
  };

  const updateReproEvent = (updated: ReproductionEvent) => setReproEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
  const deleteReproEvent = (id: string) => setReproEvents(prev => prev.filter(e => e.id !== id));
  const addHealthEvent = (e: HealthEvent) => setHealthEvents(prev => [e, ...prev]);
  const updateHealthEvent = (updated: HealthEvent) => setHealthEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
  const deleteHealthEvent = (id: string) => setHealthEvents(prev => prev.filter(e => e.id !== id));

  const addMedicine = (m: Medicine) => setMedicines(prev => [m, ...prev]);
  const updateMedicine = (updated: Medicine) => setMedicines(prev => prev.map(m => m.id === updated.id ? updated : m));
  const deleteMedicine = (id: string) => setMedicines(prev => prev.filter(m => m.id !== id));
  const saveMedicinesDirectly = (m: Medicine[]) => setMedicines(m);

  const addPurchase = (p: MedicinePurchase) => setPurchases(prev => [p, ...prev]);
  const updatePurchase = (updated: MedicinePurchase) => setPurchases(prev => prev.map(p => p.id === updated.id ? updated : p));
  const deletePurchase = (id: string) => setPurchases(prev => prev.filter(p => p.id !== id));

  const addEnrollment = (e: ProtocolEnrollment) => setEnrollments(prev => [e, ...prev]);
  const updateEnrollment = (updated: ProtocolEnrollment) => setEnrollments(prev => prev.map(e => e.id === updated.id ? updated : e));
  const deleteEnrollment = (id: string) => setEnrollments(prev => prev.filter(e => e.id !== id));

  const addCustomProtocol = (p: ProtocolTemplate) => setCustomProtocols(prev => [p, ...prev]);
  const deleteProtocolTemplate = (id: string) => setCustomProtocols(prev => prev.filter(p => p.id !== id));

  const updateSettings = (s: FarmSettings) => setSettings(s);

  return {
    loading,
    animals: animalsWithStatus,
    reproEvents,
    healthEvents,
    medicines,
    purchases,
    enrollments,
    protocols: allTemplates,
    customProtocols,
    alerts,
    stats,
    settings,
    addAnimal,
    updateAnimal,
    updateAnimalsHerd,
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
    addPurchase,
    updatePurchase,
    deletePurchase,
    addEnrollment,
    updateEnrollment,
    deleteEnrollment,
    addCustomProtocol,
    deleteProtocolTemplate,
    updateSettings
  };
};
