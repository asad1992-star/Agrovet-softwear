import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Animal, ReproductionEvent, HealthEvent, Alert, FarmSettings, ProtocolEnrollment, ProtocolTemplate, ReproEventType, AnimalStatus, Medicine, MedicinePurchase, PenMovement } from '../types';
import { storageService, DEFAULT_SETTINGS } from '../services/storage';
import { 
  computeAnimalStatus, 
  generateAlerts, 
  dateUtils,
  isYoungStockHerdGroup,
  isCalfHerdGroup,
  isYoungStockAnimal,
  isCalfAnimal,
  isBreedingEligibleAnimal,
  findFreshPen,
  findCloseupPen,
  findBreedingPen,
  findPregnantPen,
  isBreedingHeiferPen
} from '../services/businessLogic';
import { PREDEFINED_PROTOCOLS } from '../data';

export const useFarm = (currentUserEmail?: string) => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [reproEvents, setReproEvents] = useState<ReproductionEvent[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [purchases, setPurchases] = useState<MedicinePurchase[]>([]);
  const [enrollments, setEnrollments] = useState<ProtocolEnrollment[]>([]);
  const [customProtocols, setCustomProtocols] = useState<ProtocolTemplate[]>([]);
  const [settings, setSettings] = useState<FarmSettings>(DEFAULT_SETTINGS);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [penMovements, setPenMovements] = useState<PenMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const isDataLoaded = useRef(false);

  const allTemplates = useMemo(() => [...PREDEFINED_PROTOCOLS, ...customProtocols], [customProtocols]);

  const loadData = useCallback(async (emailToUse?: string) => {
    const targetEmail = emailToUse || currentUserEmail;
    try {
      setLoading(true);
      isDataLoaded.current = false;
      const workspace = await storageService.loadUserWorkspace(targetEmail || 'default');
      
      setAnimals(workspace.animals);
      setReproEvents(workspace.reproEvents);
      setHealthEvents(workspace.healthEvents);
      setMedicines(workspace.medicines);
      setPurchases(workspace.purchases);
      setEnrollments(workspace.enrollments);
      setCustomProtocols(workspace.customProtocols);
      setSettings(workspace.settings);
      setDismissedAlertIds(workspace.dismissedAlertIds || []);
      setPenMovements(workspace.penMovements || []);
    } catch (error) {
      console.error("Error loading farm data", error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        isDataLoaded.current = true;
      }, 100);
    }
  }, [currentUserEmail]);

  // Initial load or user change
  useEffect(() => {
    loadData();
  }, [loadData, currentUserEmail]);

  // Save changes when user actively modifies state (only after data is safely loaded)
  useEffect(() => {
    if (isDataLoaded.current && !loading) {
      storageService.saveAnimals(animals, currentUserEmail);
    }
  }, [animals, loading, currentUserEmail]);

  useEffect(() => {
    if (isDataLoaded.current && !loading) {
      storageService.saveReproEvents(reproEvents, currentUserEmail);
    }
  }, [reproEvents, loading, currentUserEmail]);

  useEffect(() => {
    if (isDataLoaded.current && !loading) {
      storageService.saveHealthEvents(healthEvents, currentUserEmail);
    }
  }, [healthEvents, loading, currentUserEmail]);

  useEffect(() => {
    if (isDataLoaded.current && !loading) {
      storageService.saveMedicines(medicines, currentUserEmail);
    }
  }, [medicines, loading, currentUserEmail]);

  useEffect(() => {
    if (isDataLoaded.current && !loading) {
      storageService.savePurchases(purchases, currentUserEmail);
    }
  }, [purchases, loading, currentUserEmail]);

  useEffect(() => {
    if (isDataLoaded.current && !loading) {
      storageService.saveEnrollments(enrollments, currentUserEmail);
    }
  }, [enrollments, loading, currentUserEmail]);

  useEffect(() => {
    if (isDataLoaded.current && !loading) {
      storageService.saveCustomProtocols(customProtocols, currentUserEmail);
    }
  }, [customProtocols, loading, currentUserEmail]);

  useEffect(() => {
    if (isDataLoaded.current && !loading) {
      storageService.saveSettings(settings, currentUserEmail);
    }
  }, [settings, loading, currentUserEmail]);

  useEffect(() => {
    if (isDataLoaded.current && !loading) {
      storageService.saveDismissedAlertIds(dismissedAlertIds, currentUserEmail);
    }
  }, [dismissedAlertIds, loading, currentUserEmail]);

  useEffect(() => {
    if (isDataLoaded.current && !loading) {
      storageService.savePenMovements(penMovements, currentUserEmail);
    }
  }, [penMovements, loading, currentUserEmail]);

  // Pen Movement Logger Helper
  const recordPenMovement = useCallback((animalId: string, animalTag: string, fromPen: string, toPen: string, reason: string, isAutomatic = false) => {
    if (!fromPen || !toPen || fromPen.trim().toLowerCase() === toPen.trim().toLowerCase()) return;
    const newMovement: PenMovement = {
      id: 'mov_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      animalId,
      animalTag,
      fromPen,
      toPen,
      date: dateUtils.today(),
      reason,
      isAutomatic
    };
    setPenMovements(prev => [newMovement, ...prev.filter(m => !(m.animalId === animalId && m.date === newMovement.date && m.toPen === toPen)).slice(0, 199)]);
  }, []);

  // Automatic Closeup Pen Shift Synchronizer
  useEffect(() => {
    if (!isDataLoaded.current || loading || animals.length === 0) return;
    const today = dateUtils.today();
    const closeupPen = findCloseupPen(settings.customGroups);

    const animalsToShift: { id: string; tag: string; from: string; daysLeft: number }[] = [];

    animals.forEach(animal => {
      const animalRepro = reproEvents.filter(e => e.animalId === animal.id).sort((a, b) => b.date.localeCompare(a.date));
      const lastInsem = animalRepro.find(e => e.type === ReproEventType.INSEMINATION);
      const lastPd = animalRepro.find(e => e.type === ReproEventType.PREGNANCY_CHECK && (e.pregnancyResult === 'Pregnant' || e.success === true));
      
      if (lastPd && lastInsem) {
        const expectedCalving = dateUtils.addDays(lastInsem.date, settings.gestationDays);
        const daysToCalving = dateUtils.diffDays(expectedCalving, today);
        
        if (daysToCalving <= settings.closeupDays && daysToCalving > -30) {
          if (animal.herd !== closeupPen && !animal.herd.toLowerCase().includes('close')) {
            animalsToShift.push({ id: animal.id, tag: animal.tag, from: animal.herd, daysLeft: daysToCalving });
          }
        }
      }
    });

    if (animalsToShift.length > 0) {
      animalsToShift.forEach(item => {
        recordPenMovement(
          item.id,
          item.tag,
          item.from,
          closeupPen,
          `Reached Close-up Phase (${item.daysLeft}d to expected calving)`,
          true
        );
      });

      const shiftIds = animalsToShift.map(i => i.id);
      setAnimals(prev => prev.map(a => shiftIds.includes(a.id) ? { ...a, herd: closeupPen } : a));
    }
  }, [reproEvents, settings.closeupDays, settings.gestationDays, settings.customGroups, loading, recordPenMovement]);

  // Derived Data
  const animalsWithStatus = useMemo(() => {
    return animals.map(a => ({
      ...a,
      ...computeAnimalStatus(a, reproEvents, healthEvents, enrollments, settings)
    }));
  }, [animals, reproEvents, healthEvents, enrollments, settings]);

  const allAlerts = useMemo(() => {
    return generateAlerts(animals, reproEvents, healthEvents, enrollments, allTemplates, settings, penMovements);
  }, [animals, reproEvents, healthEvents, enrollments, allTemplates, settings, penMovements]);

  // Filtered active alerts (excluding dismissed ones)
  const alerts = useMemo(() => {
    return allAlerts.filter(al => !dismissedAlertIds.includes(al.id));
  }, [allAlerts, dismissedAlertIds]);

  // Dismissed alerts list for the dismissed tab
  const dismissedAlerts = useMemo(() => {
    return allAlerts.filter(al => dismissedAlertIds.includes(al.id)).map(al => ({ ...al, dismissed: true }));
  }, [allAlerts, dismissedAlertIds]);

  const stats = useMemo(() => {
    const statuses = animalsWithStatus.map(a => a.status);
    const today = dateUtils.today();
    
    const bredAnimalIds = new Set(reproEvents.filter(e => e.type === ReproEventType.INSEMINATION).map(e => e.animalId));
    const totalBred = bredAnimalIds.size;
    const pregnant = statuses.filter(s => s === AnimalStatus.PREGNANT || s === AnimalStatus.CLOSEUP).length;
    const conceptionRate = totalBred > 0 ? Math.round((pregnant / totalBred) * 100) : 0;

    const repeatBreeders = animalsWithStatus.filter(a => {
      const insemCount = reproEvents.filter(e => e.animalId === a.id && e.type === ReproEventType.INSEMINATION).length;
      return insemCount >= 3 && a.status !== AnimalStatus.PREGNANT;
    }).length;

    const heatDueCount = alerts.filter(al => al.title.includes('Heat Check')).length;
    const calvingDueCount = alerts.filter(al => al.title.includes('Calving') && !al.title.includes('OVERDUE')).length;
    const overdueCalvingCount = alerts.filter(al => al.title.includes('Calving OVERDUE')).length;
    
    const sevenDaysAgo = dateUtils.addDays(today, -7);
    const recentlyTreated = Array.from(new Set(healthEvents.filter(e => e.date >= sevenDaysAgo).map(e => e.animalId))).length;

    return {
      total: animals.filter(a => !isCalfAnimal(a)).length,
      pregnant,
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
  
  const updateAnimal = (updated: Animal) => {
    const oldAnimal = animals.find(a => a.id === updated.id);
    if (oldAnimal && oldAnimal.herd !== updated.herd) {
      recordPenMovement(updated.id, updated.tag, oldAnimal.herd, updated.herd, 'Animal Profile Pen Update', false);
    }
    setAnimals(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const updateAnimalsHerd = (animalIds: string[], targetHerd: string, reason = 'Manual Pen Transfer') => {
    const isTargetYoungStock = isYoungStockHerdGroup(targetHerd);
    const isTargetCalf = isCalfHerdGroup(targetHerd);

    setAnimals(prev => {
      return prev.map(a => {
        if (!animalIds.includes(a.id)) return a;
        if (a.herd !== targetHerd) {
          recordPenMovement(a.id, a.tag, a.herd, targetHerd, reason, false);
        }
        let newIsCalf = a.isCalf;
        if (isTargetYoungStock) {
          newIsCalf = false;
        } else if (isTargetCalf) {
          newIsCalf = true;
        } else if (a.isCalf) {
          newIsCalf = false;
        }
        return { ...a, herd: targetHerd, isCalf: newIsCalf };
      });
    });
  };

  const deleteAnimal = (id: string) => setAnimals(prev => prev.filter(a => a.id !== id));

  const addReproEvent = (e: ReproductionEvent) => {
    if (e.type === ReproEventType.INSEMINATION && !e.protocolId) {
      setEnrollments(prev => prev.filter(enrollment => enrollment.animalId !== e.animalId || enrollment.status !== 'Active'));
    }

    // Automatic Pen-Shifting Logic on Repro Events
    const targetAnimal = animals.find(a => a.id === e.animalId);
    if (targetAnimal) {
      if (e.type === ReproEventType.INSEMINATION) {
        // 1. If young stock / heifer, auto promote to Adult Breeding Stock and move to Breeding Heifers pen
        const isYoung = isYoungStockAnimal(targetAnimal) || isCalfAnimal(targetAnimal);
        if (isYoung) {
          const breedingPen = findBreedingPen(settings.customGroups);
          if (targetAnimal.herd !== breedingPen) {
            recordPenMovement(
              targetAnimal.id,
              targetAnimal.tag,
              targetAnimal.herd,
              breedingPen,
              'Insemination recorded (Promoted to Breeding Heifers)',
              true
            );
            setAnimals(prev => prev.map(a => a.id === targetAnimal.id ? { ...a, herd: breedingPen, isCalf: false } : a));
          }
        }
      } else if (e.type === ReproEventType.CALVING) {
        // 2. If calved, automatically transfer to Fresh group
        const freshPen = findFreshPen(settings.customGroups);
        if (targetAnimal.herd !== freshPen) {
          recordPenMovement(
            targetAnimal.id,
            targetAnimal.tag,
            targetAnimal.herd,
            freshPen,
            'Calved (Auto-transferred to Fresh Pen)',
            true
          );
          setAnimals(prev => prev.map(a => a.id === targetAnimal.id ? { ...a, herd: freshPen, isCalf: false } : a));
        }
      } else if (e.type === ReproEventType.PREGNANCY_CHECK && (e.pregnancyResult === 'Pregnant' || e.success === true)) {
        // 3. If confirmed pregnant and in breeding pen, auto move to Pregnant pen
        const pregPen = findPregnantPen(settings.customGroups);
        if (targetAnimal.herd !== pregPen && (isBreedingHeiferPen(targetAnimal.herd) || targetAnimal.herd.toLowerCase().includes('breed'))) {
          recordPenMovement(
            targetAnimal.id,
            targetAnimal.tag,
            targetAnimal.herd,
            pregPen,
            'Confirmed Pregnant (Auto-transferred to Pregnant Pen)',
            true
          );
          setAnimals(prev => prev.map(a => a.id === targetAnimal.id ? { ...a, herd: pregPen } : a));
        }
      }
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

  // Alert Dismissal Actions
  const dismissAlert = (alertId: string) => {
    setDismissedAlertIds(prev => Array.from(new Set([...prev, alertId])));
  };

  const restoreAlert = (alertId: string) => {
    setDismissedAlertIds(prev => prev.filter(id => id !== alertId));
  };

  const clearAllDismissedAlerts = () => {
    setDismissedAlertIds([]);
  };

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
    dismissedAlerts,
    allAlerts,
    penMovements,
    stats,
    settings,
    reloadFarmData: loadData,
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
    updateSettings,
    recordPenMovement,
    dismissAlert,
    restoreAlert,
    clearAllDismissedAlerts
  };
};
