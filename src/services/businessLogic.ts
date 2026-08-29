
import { 
  Animal, 
  ReproductionEvent, 
  HealthEvent, 
  AnimalStatus, 
  ReproEventType, 
  HealthEventType,
  Alert,
  FarmSettings,
  ProtocolEnrollment,
  ProtocolTemplate,
  PenMovement
} from '../types';

export const dateUtils = {
  addDays: (dateStr: string, days: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },
  diffDays: (d1: string, d2: string) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
  },
  isTodayOrPast: (dateStr: string) => {
    return new Date(dateStr) <= new Date();
  },
  isSameDay: (d1: string, d2: string) => {
    return d1 === d2;
  },
  today: () => new Date().toISOString().split('T')[0],
  normalizeName: (name: string) => {
    if (!name) return '';
    return name.trim().split(/\s+/).map(word => {
      const lower = word.toLowerCase();
      if (lower === 'sb' || lower === 'sb.') return 'Sb';
      if (lower === 'dr' || lower === 'dr.') return 'Dr.';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  },
  getUniqueNormalized: (values: (string | undefined | null)[], knownList?: string[]) => {
    const normalizedMap = new Map<string, string>();
    values.forEach(v => {
      if (!v) return;
      const n = normalizeTechnicianName(v, knownList);
      const lower = n.toLowerCase();
      if (!normalizedMap.has(lower)) {
        normalizedMap.set(lower, n);
      }
    });
    return Array.from(normalizedMap.values()).sort();
  }
};

/**
 * Smart Group / Pen Matching Helpers
 */
export const findFreshPen = (customGroups?: string[]): string => {
  const groups = customGroups || ['Fresh', 'Main Herd'];
  const match = groups.find(g => g.toLowerCase().includes('fresh'));
  return match || 'Fresh';
};

export const findPregnantPen = (customGroups?: string[]): string => {
  const groups = customGroups || ['Pregnant', 'Main Herd'];
  const match = groups.find(g => g.toLowerCase().includes('pregnant'));
  return match || 'Pregnant';
};

export const findCloseupPen = (customGroups?: string[]): string => {
  const groups = customGroups || ['Closeup', 'Close Up', 'Main Herd'];
  const match = groups.find(g => g.toLowerCase().includes('close'));
  return match || 'Closeup';
};

export const findBreedingPen = (customGroups?: string[]): string => {
  const groups = customGroups || ['Breeding Heifers', 'Breeding Pen', 'Main Herd'];
  const match = groups.find(g => g.toLowerCase().includes('breeding heifer') || g.toLowerCase().includes('breeding'));
  return match || 'Breeding Heifers';
};

export const isBreedingPen = (herdName?: string): boolean => {
  if (!herdName) return false;
  const h = herdName.toLowerCase().trim();
  return h.includes('breed'); // 'breeding', 'breeding heifers', 'breeding pen', etc.
};

export const isBreedingHeiferPen = (herdName?: string): boolean => {
  if (!herdName) return false;
  const h = herdName.toLowerCase().trim();
  return (
    h.includes('breeding') ||
    h === 'breeding pen' ||
    h === 'breeding heifers'
  );
};

/**
 * Smart Name Normalization & Auto-Merging for Technicians & Semen
 */
export const normalizeTechnicianName = (rawTech?: string, knownTechs?: string[]): string => {
  if (!rawTech) return '';
  const trimmed = rawTech.trim();
  if (!trimmed) return '';

  const defaultKnown = ['Asad Mehmood', 'Faisal Sb'];
  const fullKnown = Array.from(new Set([...(knownTechs || []), ...defaultKnown]));

  // Check case-insensitive match against configured list
  const match = fullKnown.find(k => k.toLowerCase() === trimmed.toLowerCase() || (trimmed.toLowerCase().includes('asad') && k.toLowerCase().includes('asad')));
  if (match) return match;

  // Otherwise format cleanly in proper title case
  return dateUtils.normalizeName(trimmed);
};

export const normalizeSemenName = (rawSemen?: string, knownSemenList?: string[]): string => {
  if (!rawSemen) return '';
  const trimmed = rawSemen.trim();
  if (!trimmed) return '';

  if (knownSemenList && knownSemenList.length > 0) {
    const match = knownSemenList.find(k => k.toLowerCase() === trimmed.toLowerCase());
    if (match) return match;
  }

  return dateUtils.normalizeName(trimmed);
};

/**
 * Smart Group & Young Stock Detection Helpers
 * Recognizes growing heifers, suckling, post-weaning pens (with flexible spellings)
 * and distinguishes young stock from breeding-ready adult cows.
 * NOTE: The pen 'Breeding' / 'Breeding Heifers' is ADULT/BREEDING STOCK, NOT young stock.
 */
export const isYoungStockHerdGroup = (herdName?: string): boolean => {
  if (!herdName) return false;
  const h = herdName.toLowerCase().trim();
  
  // Any breeding pen is explicitly ADULT/BREEDING stock, NOT young stock!
  if (isBreedingPen(herdName)) return false;

  return (
    h.includes('growing') ||
    h.includes('target') ||
    h.includes('suckl') || // matches suckling, sucklin, suckler, etc.
    h.includes('post wean') ||
    h.includes('post-wean') ||
    h.includes('postwean') ||
    h.includes('post ween') ||
    h.includes('post-ween') ||
    h.includes('postween') ||
    h.includes('young stock') ||
    h.includes('youngstock') ||
    h.includes('juvenile')
  );
};

export const isCalfHerdGroup = (herdName?: string): boolean => {
  if (!herdName) return false;
  const h = herdName.toLowerCase().trim();
  if (isYoungStockHerdGroup(herdName)) return false;
  if (isBreedingPen(herdName)) return false;
  return h.includes('calf') || h.includes('calves') || h.includes('nursery') || h.includes('pre-wean') || h.includes('prewean');
};

export const isYoungStockAnimal = (animal?: { herd?: string; isCalf?: boolean; status?: AnimalStatus } | null): boolean => {
  if (!animal) return false;
  // If animal is in a breeding pen, it is adult/breeding stock, never young stock
  if (isBreedingPen(animal.herd)) return false;
  return isYoungStockHerdGroup(animal.herd) || animal.status === AnimalStatus.YOUNG_STOCK;
};

export const isCalfAnimal = (animal?: { herd?: string; isCalf?: boolean; status?: AnimalStatus } | null): boolean => {
  if (!animal) return false;
  if (isYoungStockAnimal(animal)) return false;
  if (isBreedingPen(animal.herd)) return false;
  return !!animal.isCalf || isCalfHerdGroup(animal.herd);
};

export const isBreedingEligibleAnimal = (animal?: { herd?: string; isCalf?: boolean; status?: AnimalStatus } | null): boolean => {
  if (!animal) return false;
  if (isCalfAnimal(animal) || isYoungStockAnimal(animal)) return false;
  return true;
};

/**
 * Deterministic State Machine
 * Calculates the current status of an animal based on its event history and farm settings.
 * Reproductive status is strictly independent of health treatment logs.
 */
export const computeAnimalStatus = (
  animal: Animal,
  reproEvents: ReproductionEvent[],
  healthEvents: HealthEvent[],
  enrollments: ProtocolEnrollment[],
  settings: FarmSettings
): { 
  status: AnimalStatus; 
  healthStatus?: AnimalStatus.SICK | AnimalStatus.OBSERVATION | AnimalStatus.ACTIVE;
  expectedCalving?: string; 
  pregnancyDays?: number; 
  serviceDate?: string; 
  activeProtocol?: ProtocolEnrollment;
  isSick?: boolean;
} => {
  const today = dateUtils.today();
  
  // 1. Check Health independently
  const sortedHealth = [...healthEvents]
    .filter(e => e.animalId === animal.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  
  let healthStatus: AnimalStatus.SICK | AnimalStatus.OBSERVATION | AnimalStatus.ACTIVE = AnimalStatus.ACTIVE;
  let isSick = false;

  const latestHealth = sortedHealth[0];
  if (latestHealth) {
    if (latestHealth.cureStatus === 'Cured') {
      healthStatus = AnimalStatus.ACTIVE;
      isSick = false;
    } else if (latestHealth.cureStatus === 'Not Cured') {
      healthStatus = AnimalStatus.SICK;
      isSick = true;
    } else if (latestHealth.type === HealthEventType.ILLNESS) {
      if (latestHealth.treatmentDays) {
        const endDate = dateUtils.addDays(latestHealth.date, latestHealth.treatmentDays);
        if (today <= endDate || latestHealth.cureStatus === 'Pending' || !latestHealth.cureStatus) {
          healthStatus = AnimalStatus.SICK;
          isSick = true;
        }
      } else {
        healthStatus = AnimalStatus.SICK;
        isSick = true;
      }
    } else if (latestHealth.type === HealthEventType.OBSERVATION) {
      healthStatus = AnimalStatus.OBSERVATION;
    }
  }

  // 2. Check Active Protocols
  const activeEnrollment = enrollments.find(e => e.animalIds?.includes(animal.id) && e.status === 'Active');

  // 3. Check Young Stock status
  const isYoungStock = isYoungStockAnimal(animal);

  // 4. Check Repro Cycle
  const sortedRepro = [...reproEvents]
    .filter(e => e.animalId === animal.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const latest = sortedRepro[0];
  
  // Base reproductive status calculation
  let baseReproStatus: AnimalStatus = isYoungStock ? AnimalStatus.YOUNG_STOCK : AnimalStatus.ACTIVE;
  let expectedCalving: string | undefined;
  let pregnancyDays: number | undefined;
  let serviceDate: string | undefined;

  if (activeEnrollment) {
    baseReproStatus = AnimalStatus.IN_PROTOCOL;
  } else if (latest) {
    switch (latest.type) {
      case ReproEventType.INSEMINATION:
        baseReproStatus = AnimalStatus.INSEMINATED;
        pregnancyDays = dateUtils.diffDays(today, latest.date);
        serviceDate = latest.date;
        break;
      
      case ReproEventType.PREGNANCY_CHECK:
        if (latest.success && latest.pregnancyResult !== 'Non-Pregnant') {
          const lastInsem = sortedRepro.find(e => e.type === ReproEventType.INSEMINATION && e.date <= latest.date);
          expectedCalving = lastInsem ? dateUtils.addDays(lastInsem.date, settings.gestationDays) : undefined;
          pregnancyDays = lastInsem ? dateUtils.diffDays(today, lastInsem.date) : undefined;
          serviceDate = lastInsem?.date;
          
          if (expectedCalving) {
            const daysToCalving = dateUtils.diffDays(expectedCalving, today);
            if (daysToCalving <= settings.closeupDays) {
              baseReproStatus = AnimalStatus.CLOSEUP;
            } else if (daysToCalving <= settings.dryPeriodDays) {
              baseReproStatus = AnimalStatus.DRY;
            } else {
              baseReproStatus = AnimalStatus.PREGNANT;
            }
          } else {
            baseReproStatus = AnimalStatus.PREGNANT;
          }
        } else {
          baseReproStatus = isYoungStock ? AnimalStatus.YOUNG_STOCK : AnimalStatus.ACTIVE;
          pregnancyDays = 0;
          expectedCalving = undefined;
        }
        break;

      case ReproEventType.CALVING:
        baseReproStatus = isYoungStock ? AnimalStatus.YOUNG_STOCK : AnimalStatus.ACTIVE;
        pregnancyDays = 0;
        expectedCalving = undefined;
        break;

      case ReproEventType.DRY_OFF:
        baseReproStatus = AnimalStatus.DRY;
        break;

      case ReproEventType.ABORTION:
        baseReproStatus = isYoungStock ? AnimalStatus.YOUNG_STOCK : AnimalStatus.ACTIVE;
        pregnancyDays = 0;
        expectedCalving = undefined;
        break;

      default:
        baseReproStatus = isYoungStock ? AnimalStatus.YOUNG_STOCK : AnimalStatus.ACTIVE;
        break;
    }
  }

  // If sick or under observation, return status preserving expectedCalving, pregnancyDays and serviceDate so reproductive status is NEVER linked or wiped by health!
  const finalStatus = (isSick && baseReproStatus === AnimalStatus.ACTIVE) 
    ? AnimalStatus.SICK 
    : (healthStatus === AnimalStatus.OBSERVATION && baseReproStatus === AnimalStatus.ACTIVE)
      ? AnimalStatus.OBSERVATION
      : baseReproStatus;

  return {
    status: finalStatus,
    healthStatus,
    isSick,
    expectedCalving,
    pregnancyDays,
    serviceDate,
    activeProtocol: activeEnrollment
  };
};

export const generateAlerts = (
  animals: Animal[],
  reproEvents: ReproductionEvent[],
  healthEvents: HealthEvent[],
  enrollments: ProtocolEnrollment[],
  templates: ProtocolTemplate[],
  settings: FarmSettings,
  penMovements: PenMovement[] = []
): Alert[] => {
  const alerts: Alert[] = [];
  const today = dateUtils.today();

  // Pen Movement Alerts (both manual and automatic)
  penMovements
    .filter(m => !(m.fromPen.toLowerCase().includes('fresh') && m.toPen.toLowerCase().includes('close') && m.isAutomatic))
    .slice(0, 50).forEach(movement => {
    alerts.push({
      id: `alert-movement-${movement.id}`,
      type: 'System',
      title: `Pen Moved: ${movement.animalTag}`,
      description: `Cow ${movement.animalTag} moved from "${movement.fromPen}" to "${movement.toPen}" (${movement.reason}) on ${movement.date}.`,
      dueDate: movement.date,
      animalId: movement.animalId,
      priority: movement.isAutomatic ? 'High' : 'Medium',
      metadata: { fromPen: movement.fromPen, toPen: movement.toPen, isAutomatic: movement.isAutomatic, eventKind: 'movement' }
    });
  });

  // Protocol Alerts - Grouped by protocol template step (only show 1 day before, today, or overdue)
  const protocolAlertMap: Record<string, { animals: string[], stepDate: string, daysUntil: number, stepAction: string, stepDay: number, templateName: string, stepTime?: string, protocolId: string, stepIdx: number }> = {};

  animals.forEach(animal => {
    const animalRepro = reproEvents.filter(e => e.animalId === animal.id).sort((a, b) => b.date.localeCompare(a.date));
    const { status, expectedCalving, activeProtocol, pregnancyDays } = computeAnimalStatus(animal, reproEvents, healthEvents, enrollments, settings);

    if (activeProtocol) {
      const template = templates.find(t => t.id === activeProtocol.templateId);
      if (template) {
        template.steps.forEach((step, idx) => {
          if (activeProtocol.completedStepIndices.includes(idx)) return;
          const stepDate = dateUtils.addDays(activeProtocol.startDate, step.dayOffset);
          const daysUntil = dateUtils.diffDays(stepDate, today);
          // Alert ONLY 1 day before (daysUntil <= 1) and keep if overdue (daysUntil < 0)
          if (daysUntil <= 1 && daysUntil >= -14) {
            const key = `${activeProtocol.id}-step-${idx}-${stepDate}`;
            if (!protocolAlertMap[key]) {
              protocolAlertMap[key] = { 
                animals: [], 
                stepDate, 
                daysUntil, 
                stepAction: step.action, 
                stepDay: step.dayOffset, 
                templateName: template.name, 
                stepTime: step.time,
                protocolId: activeProtocol.id,
                stepIdx: idx
              };
            }
            activeProtocol.animalIds?.forEach(id => {
              const a = animals.find(anim => anim.id === id);
              if (a && !protocolAlertMap[key].animals.includes(a.tag)) {
                protocolAlertMap[key].animals.push(a.tag);
              }
            });
          }
        });
      }
    }

    // Pregnancy Check Alert - ONLY 1 day before check due date (e.g. at 29d if check at 30d) and stays as OVERDUE if missed
    if (status === AnimalStatus.INSEMINATED) {
      const lastInsem = animalRepro[0];
      if (lastInsem) {
        const daysSince = dateUtils.diffDays(today, lastInsem.date);
        const checkDueDate = dateUtils.addDays(lastInsem.date, settings.pregnancyCheckDays);
        const daysUntilDue = dateUtils.diffDays(checkDueDate, today);

        // Alert shows starting 1 day before due date (daysUntilDue <= 1), on due date (0), and stays Overdue (< 0)
        if (daysUntilDue <= 1 && daysSince <= 120) { 
          const isOverdue = daysUntilDue < 0;
          const isTomorrow = daysUntilDue === 1;
          const isToday = daysUntilDue === 0;

          alerts.push({
            id: `alert-check-${animal.id}`,
            type: 'Repro',
            title: isOverdue ? 'Pregnancy Check OVERDUE' : isToday ? 'Pregnancy Check Due TODAY' : 'Pregnancy Check Due Tomorrow',
            description: `${animal.tag} (P-${daysSince}d): Inseminated on ${lastInsem.date}. ${isOverdue ? `Overdue by ${Math.abs(daysUntilDue)} day(s).` : isToday ? 'Perform PD check today.' : 'Due tomorrow.'}`,
            dueDate: checkDueDate,
            animalId: animal.id,
            priority: isOverdue ? 'High' : isToday ? 'High' : 'Medium',
            metadata: { eventKind: 'repro_pd', defaultEventType: ReproEventType.PREGNANCY_CHECK, animalId: animal.id }
          });
        }
      }
    }

    // Heat Cycle Alert (21-day cycle check after Estrus or Insemination) - 1 day before & overdue
    {
      const lastHeat = animalRepro.find(e => e.type === ReproEventType.ESTRUS || e.type === ReproEventType.INSEMINATION);
      if (lastHeat && (status === AnimalStatus.ACTIVE || status === AnimalStatus.INSEMINATED)) {
        const nextHeatDueDays = settings.estrusCycleDays || 21;
        const nextHeatDate = dateUtils.addDays(lastHeat.date, nextHeatDueDays);
        const daysUntilHeat = dateUtils.diffDays(nextHeatDate, today);

        // Alert starts 1 day before (daysUntilHeat <= 1) and stays up to 4 days overdue
        if (daysUntilHeat <= 1 && daysUntilHeat >= -4) {
          const isOverdue = daysUntilHeat < 0;
          alerts.push({
            id: `alert-heat-${animal.id}`,
            type: 'Repro',
            title: isOverdue ? 'Heat Check OVERDUE' : daysUntilHeat === 0 ? 'Heat Check Due TODAY' : 'Heat Check Due Tomorrow',
            description: `${animal.tag}: ${nextHeatDueDays}-day heat cycle check. Last event: ${lastHeat.type} on ${lastHeat.date}.`,
            dueDate: nextHeatDate,
            animalId: animal.id,
            priority: isOverdue ? 'High' : 'Medium',
            metadata: { eventKind: 'repro_heat', defaultEventType: ReproEventType.ESTRUS, animalId: animal.id }
          });
        }
      }
    }

    // Upcoming Calving Alert - 1 day before (or when entered closeup window) and overdue
    if (expectedCalving) {
      const daysLeft = dateUtils.diffDays(expectedCalving, today);
      // Alert triggers 1 day before calving (or in closeup) and stays as OVERDUE
      if (daysLeft <= 1 && daysLeft >= -30) {
        const isOverdue = daysLeft < 0;
        alerts.push({
          id: `alert-calving-${animal.id}`,
          type: 'Repro',
          title: isOverdue ? 'Calving OVERDUE' : daysLeft === 0 ? 'Calving Expected TODAY' : 'Calving Expected Tomorrow',
          description: isOverdue 
            ? `${animal.tag} (P-${pregnancyDays || 0}d) is overdue for calving by ${Math.abs(daysLeft)} day(s).` 
            : daysLeft === 0 
              ? `${animal.tag} is due for calving today!` 
              : `${animal.tag} (P-${pregnancyDays || 0}d) expected calving tomorrow.`,
          dueDate: expectedCalving,
          animalId: animal.id,
          priority: 'High',
          metadata: { eventKind: 'repro_calving', defaultEventType: ReproEventType.CALVING, animalId: animal.id }
        });
      }
    }

    // Health Multi-Day Treatment Reminders & Cure Evaluation Alerts
    const animalHealth = healthEvents
      .filter(e => e.animalId === animal.id && (e.treatmentDays || e.type === HealthEventType.ILLNESS))
      .sort((a, b) => b.date.localeCompare(a.date));
    
    animalHealth.forEach(event => {
      const treatmentDays = event.treatmentDays || 1;
      const dosesGiven = event.dosesAdministered || [event.date];
      const medName = event.medication || (event.treatments && event.treatments.length > 0 ? event.treatments.map(t => t.name).join(', ') : '') || event.details;

      // 1. Daily dose alerts during the treatment course
      for (let dayIdx = 0; dayIdx < treatmentDays; dayIdx++) {
        const doseDate = dateUtils.addDays(event.date, dayIdx);
        const daysUntilDose = dateUtils.diffDays(doseDate, today);
        const dayNumber = dayIdx + 1;

        // Has this specific day's dose already been recorded?
        const isDoseGiven = dosesGiven.includes(doseDate);

        // If dose has NOT been entered for this date, show alert ONLY 1 day before (daysUntilDose = 1), TODAY (0), or OVERDUE (< 0)
        if (!isDoseGiven && daysUntilDose <= 1 && daysUntilDose >= -7) {
          const isOverdue = daysUntilDose < 0;
          const isToday = daysUntilDose === 0;

          alerts.push({
            id: `health-dose-${event.id}-day-${dayNumber}-${doseDate}`,
            type: 'Health',
            title: isOverdue 
              ? `Treatment Dose ${dayNumber}/${treatmentDays} OVERDUE` 
              : isToday 
                ? `Treatment Dose ${dayNumber}/${treatmentDays} Due TODAY` 
                : `Treatment Dose ${dayNumber}/${treatmentDays} Due Tomorrow`,
            description: `${animal.tag}: Day ${dayNumber} of ${treatmentDays} (${medName}). ${isOverdue ? `Missed on ${doseDate} — dose required.` : isToday ? 'Administer today\'s scheduled dose.' : 'Scheduled for tomorrow.'}`,
            dueDate: doseDate,
            animalId: animal.id,
            priority: isOverdue ? 'High' : isToday ? 'High' : 'Medium',
            metadata: { 
              eventKind: 'health_dose', 
              healthEventId: event.id, 
              animalId: animal.id, 
              dayNumber, 
              totalDays: treatmentDays, 
              doseDate, 
              medication: medName,
              treatments: event.treatments 
            }
          });
        }
      }

      // 2. Cure Evaluation Alert on the last day / after final dose of treatment
      const finalDoseDate = dateUtils.addDays(event.date, treatmentDays - 1);
      const daysUntilFinal = dateUtils.diffDays(finalDoseDate, today);

      // Trigger Cure evaluation alert on final day (daysUntilFinal <= 0) if not evaluated yet (cureStatus !== 'Cured' && cureStatus !== 'Not Cured')
      if (daysUntilFinal <= 0 && daysUntilFinal >= -14 && (!event.cureStatus || event.cureStatus === 'Pending')) {
        alerts.push({
          id: `health-cure-eval-${event.id}`,
          type: 'Health',
          title: 'Cure Check: Is Cow Cured or Still Sick?',
          description: `${animal.tag} completed treatment course for ${medName}. Confirm outcome: Is she cured (return to normal) or still sick?`,
          dueDate: finalDoseDate,
          animalId: animal.id,
          priority: 'High',
          metadata: { 
            eventKind: 'health_cure_eval', 
            healthEventId: event.id, 
            animalId: animal.id, 
            medication: medName,
            treatmentDays 
          }
        });
      }
    });
  });

  // Convert grouped protocol alerts to actual alert objects
  Object.entries(protocolAlertMap).forEach(([key, data]) => {
    const { animals: animalTags, stepDate, daysUntil, stepAction, stepDay, templateName, stepTime, protocolId, stepIdx } = data;
    const countLabel = animalTags.length === 1 ? animalTags[0] : `${animalTags.length} Cows`;
    alerts.push({
      id: `protocol-grouped-${key}`,
      type: 'Protocol',
      title: daysUntil < 0 ? `Protocol Step OVERDUE` : daysUntil === 0 ? 'Protocol Step Due TODAY' : `Protocol Step Due Tomorrow`,
      description: `${countLabel} — ${stepAction} (Day ${stepDay} of "${templateName}")${stepTime ? ` @ ${stepTime}` : ''}${animalTags.length > 1 ? `. Tags: ${animalTags.slice(0,5).join(', ')}${animalTags.length > 5 ? ` +${animalTags.length - 5} more` : ''}` : ''}`,
      dueDate: stepDate,
      priority: daysUntil <= 0 ? 'High' : 'Medium',
      metadata: { eventKind: 'protocol_step', protocolId, stepIdx, stepDate }
    });
  });

  return alerts.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};

export const validations = {
  validateReproductionEvent: (event: Partial<ReproductionEvent>, currentStatus: AnimalStatus) => {
    // Allow abortion/illness note at any stage
    const isAbortionNote = event.details?.toLowerCase().includes('abort');
    if (isAbortionNote) return; // Allow any event if it documents an abortion

    if (event.type === ReproEventType.INSEMINATION) {
      if (currentStatus !== AnimalStatus.ACTIVE && currentStatus !== AnimalStatus.YOUNG_STOCK) {
         throw new Error(`Cannot Inseminate: Cow is currently ${currentStatus}. Current status must be Open/Active or Young Stock. (Tip: If cow aborted or had a negative check, ensure the event is logged to return her to Open).`);
      }
    }
    if (event.type === ReproEventType.PREGNANCY_CHECK) {
      if (currentStatus !== AnimalStatus.INSEMINATED && currentStatus !== AnimalStatus.PREGNANT && currentStatus !== AnimalStatus.ACTIVE) {
        throw new Error(`Pregnancy check requires cow to be Inseminated first. Current status: ${currentStatus}.`);
      }
    }
    if (event.type === ReproEventType.CALVING) {
      if (![AnimalStatus.PREGNANT, AnimalStatus.CLOSEUP, AnimalStatus.ACTIVE].includes(currentStatus)) {
        throw new Error(`Calving requires cow to be Pregnant or in Closeup. Current status: ${currentStatus}.`);
      }
    }
    if (event.type === ReproEventType.DRY_OFF) {
      if (currentStatus !== AnimalStatus.PREGNANT && currentStatus !== AnimalStatus.CLOSEUP) {
        throw new Error(`Dry Off requires cow to be Pregnant. Current status: ${currentStatus}.`);
      }
    }
    if (event.date && !dateUtils.isTodayOrPast(event.date)) {
      throw new Error('Events cannot be recorded in the future.');
    }
  }
};


export function getMedicineDoseSuggestions(
  medicineName?: string,
  healthEvents: any[] = [],
  medicines: any[] = []
): { suggestions: string[] } {
  if (!medicineName || !medicineName.trim()) {
    return { suggestions: [] };
  }
  const cleanName = medicineName.trim().toLowerCase();
  
  // Historical doses from health events
  const historyDoses = new Set<string>();
  healthEvents.forEach(ev => {
    if (ev.treatments && Array.isArray(ev.treatments) && ev.treatments.length > 0) {
      ev.treatments.forEach((t: any) => {
        if (t?.name && t.name.toLowerCase() === cleanName && t.dose && t.dose.trim()) {
          historyDoses.add(t.dose.trim());
        }
      });
    } else if (ev.medication && ev.medication.toLowerCase() === cleanName && ev.dosage && ev.dosage.trim()) {
      historyDoses.add(ev.dosage.trim());
    }
  });

  const suggestions: string[] = Array.from(historyDoses);
  
  // Check matching medicine stock for category defaults
  const matchedMed = medicines.find((m: any) => m?.name && m.name.toLowerCase() === cleanName);
  const commonFallbacks = matchedMed?.category === 'Tablet' || matchedMed?.category === 'Bolus'
    ? ['2 Bolus', '1 Bolus', '4 Bolus']
    : matchedMed?.category === 'Powder'
    ? ['50g', '100g', '25g']
    : ['20ml', '15ml', '10ml', '30ml', '5ml'];

  commonFallbacks.forEach(fb => {
    if (!suggestions.includes(fb) && suggestions.length < 4) {
      suggestions.push(fb);
    }
  });

  return { suggestions: suggestions.slice(0, 5) };
}
