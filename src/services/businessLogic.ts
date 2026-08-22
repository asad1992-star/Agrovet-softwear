
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
  ProtocolTemplate
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

export const isBreedingHeiferPen = (herdName?: string): boolean => {
  if (!herdName) return false;
  const h = herdName.toLowerCase().trim();
  return (
    h.includes('heifer') ||
    h.includes('breeding') ||
    h.includes('growing') ||
    h === 'heifers' ||
    h === 'breeding pen' ||
    h === 'growing heifers'
  );
};

/**
 * Smart Name Normalization & Auto-Merging for Technicians & Semen
 */
export const normalizeTechnicianName = (rawTech?: string, knownTechs?: string[]): string => {
  if (!rawTech) return '';
  const trimmed = rawTech.trim();
  if (!trimmed) return '';

  const defaultKnown = ['Asad', 'Faisal Sb'];
  const fullKnown = Array.from(new Set([...(knownTechs || []), ...defaultKnown]));

  // Check case-insensitive match against configured list
  const match = fullKnown.find(k => k.toLowerCase() === trimmed.toLowerCase());
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
 */
export const isYoungStockHerdGroup = (herdName?: string): boolean => {
  if (!herdName) return false;
  const h = herdName.toLowerCase().trim();
  return (
    h.includes('growing') ||
    h.includes('heifer') ||
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
  return h.includes('calf') || h.includes('calves') || h.includes('nursery') || h.includes('pre-wean') || h.includes('prewean');
};

export const isYoungStockAnimal = (animal?: { herd?: string; isCalf?: boolean; status?: AnimalStatus } | null): boolean => {
  if (!animal) return false;
  return isYoungStockHerdGroup(animal.herd) || animal.status === AnimalStatus.YOUNG_STOCK;
};

export const isCalfAnimal = (animal?: { herd?: string; isCalf?: boolean; status?: AnimalStatus } | null): boolean => {
  if (!animal) return false;
  if (isYoungStockAnimal(animal)) return false;
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
 */
export const computeAnimalStatus = (
  animal: Animal,
  reproEvents: ReproductionEvent[],
  healthEvents: HealthEvent[],
  enrollments: ProtocolEnrollment[],
  settings: FarmSettings
): { status: AnimalStatus; expectedCalving?: string; pregnancyDays?: number; serviceDate?: string; activeProtocol?: ProtocolEnrollment } => {
  const today = dateUtils.today();
  
  // 1. Check Health (Sick status overrides Repro status)
  const sortedHealth = [...healthEvents]
    .filter(e => e.animalId === animal.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  
  const latestHealth = sortedHealth[0];
  if (latestHealth && latestHealth.type === HealthEventType.ILLNESS) {
    // Check if within treatment period
    if (latestHealth.treatmentDays) {
      const endDate = dateUtils.addDays(latestHealth.date, latestHealth.treatmentDays);
      if (today <= endDate) {
        return { status: AnimalStatus.SICK };
      }
    } else {
      return { status: AnimalStatus.SICK };
    }
  }

  if (latestHealth && latestHealth.type === HealthEventType.OBSERVATION) {
    return { status: AnimalStatus.OBSERVATION };
  }

  // 2. Check Active Protocols (Overrides standard repro status)
  const activeEnrollment = enrollments.find(e => e.animalIds?.includes(animal.id) && e.status === 'Active');
  if (activeEnrollment) {
    return { status: AnimalStatus.IN_PROTOCOL, activeProtocol: activeEnrollment };
  }

  // 3. Check Young Stock status (if assigned to growing / suckling / post-weaning pen)
  const isYoungStock = isYoungStockAnimal(animal);

  // 4. Check Repro Cycle
  const sortedRepro = [...reproEvents]
    .filter(e => e.animalId === animal.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const latest = sortedRepro[0];
  if (!latest) {
    return { status: isYoungStock ? AnimalStatus.YOUNG_STOCK : AnimalStatus.ACTIVE };
  }

  switch (latest.type) {
    case ReproEventType.INSEMINATION:
      return { 
        status: AnimalStatus.INSEMINATED, 
        pregnancyDays: dateUtils.diffDays(today, latest.date),
        serviceDate: latest.date 
      };
    
    case ReproEventType.PREGNANCY_CHECK:
      if (latest.success && latest.pregnancyResult !== 'Non-Pregnant') {
        const lastInsem = sortedRepro.find(e => e.type === ReproEventType.INSEMINATION && e.date <= latest.date);
        const expectedCalving = lastInsem ? dateUtils.addDays(lastInsem.date, settings.gestationDays) : undefined;
        const pregnancyDays = lastInsem ? dateUtils.diffDays(today, lastInsem.date) : undefined;
        const serviceDate = lastInsem?.date;
        
        if (expectedCalving) {
          const daysToCalving = dateUtils.diffDays(expectedCalving, today);
          if (daysToCalving <= settings.closeupDays) return { status: AnimalStatus.CLOSEUP, expectedCalving, pregnancyDays, serviceDate };
          if (daysToCalving <= settings.dryPeriodDays) return { status: AnimalStatus.DRY, expectedCalving, pregnancyDays, serviceDate };
        }
        return { status: AnimalStatus.PREGNANT, expectedCalving, pregnancyDays, serviceDate };
      }
      return { status: isYoungStock ? AnimalStatus.YOUNG_STOCK : AnimalStatus.ACTIVE };

    case ReproEventType.CALVING:
      return { status: isYoungStock ? AnimalStatus.YOUNG_STOCK : AnimalStatus.ACTIVE };

    case ReproEventType.DRY_OFF:
      return { status: AnimalStatus.DRY };

    case ReproEventType.ABORTION:
      return { status: isYoungStock ? AnimalStatus.YOUNG_STOCK : AnimalStatus.ACTIVE };

    default:
      return { status: isYoungStock ? AnimalStatus.YOUNG_STOCK : AnimalStatus.ACTIVE };
  }
};

export const generateAlerts = (
  animals: Animal[],
  reproEvents: ReproductionEvent[],
  healthEvents: HealthEvent[],
  enrollments: ProtocolEnrollment[],
  templates: ProtocolTemplate[],
  settings: FarmSettings
): Alert[] => {
  const alerts: Alert[] = [];
  const today = dateUtils.today();

  // Protocol Alerts - Grouped by protocol template step (not per individual animal)
  const protocolAlertMap: Record<string, { animals: string[], stepDate: string, daysUntil: number, stepAction: string, stepDay: number, templateName: string, stepTime?: string }> = {};

  animals.forEach(animal => {
    const animalRepro = reproEvents.filter(e => e.animalId === animal.id).sort((a, b) => b.date.localeCompare(a.date));
    const { status, expectedCalving, activeProtocol } = computeAnimalStatus(animal, reproEvents, healthEvents, enrollments, settings);

    if (activeProtocol) {
      const template = templates.find(t => t.id === activeProtocol.templateId);
      if (template) {
        template.steps.forEach((step, idx) => {
          if (activeProtocol.completedStepIndices.includes(idx)) return;
          const stepDate = dateUtils.addDays(activeProtocol.startDate, step.dayOffset);
          const daysUntil = dateUtils.diffDays(stepDate, today);
          if (daysUntil <= 3) {
            const key = `${activeProtocol.id}-step-${idx}-${stepDate}`;
            if (!protocolAlertMap[key]) {
              protocolAlertMap[key] = { animals: [], stepDate, daysUntil, stepAction: step.action, stepDay: step.dayOffset, templateName: template.name, stepTime: step.time };
            }
            // Add all animals in this group to the alert
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

    // Pregnancy Check Alert - inseminated animals approaching check window
    if (status === AnimalStatus.INSEMINATED) {
      const lastInsem = animalRepro[0];
      const daysSince = dateUtils.diffDays(today, lastInsem.date);
      // Alerts appear when approaching or past the setting threshold
      if (daysSince >= 1) { 
        alerts.push({
          id: `alert-check-${animal.id}`,
          type: 'Repro',
          title: daysSince >= settings.pregnancyCheckDays ? 'Pregnancy Check OVERDUE' : 'Pregnancy Check Required',
          description: `${animal.tag} has been inseminated for ${daysSince} days. Pregnancy check due.`,
          dueDate: dateUtils.addDays(lastInsem.date, settings.pregnancyCheckDays),
          animalId: animal.id,
          priority: daysSince >= settings.pregnancyCheckDays ? 'High' : 'Medium'
        });
      }
    }

    // Heat Cycle Alert (21-day cycle check after Estrus or Insemination)
    {
      const lastHeat = animalRepro.find(e => e.type === ReproEventType.ESTRUS || e.type === ReproEventType.INSEMINATION);
      if (lastHeat && status === AnimalStatus.ACTIVE) {
        const daysSince = dateUtils.diffDays(today, lastHeat.date);
        const nextHeatDue = settings.estrusCycleDays || 21;
        if (daysSince >= nextHeatDue - 2 && daysSince <= nextHeatDue + 5) {
          alerts.push({
            id: `alert-heat-${animal.id}`,
            type: 'Repro',
            title: daysSince >= nextHeatDue ? 'Heat Check Due' : `Heat Check in ${nextHeatDue - daysSince} days`,
            description: `${animal.tag}: ${nextHeatDue}-day heat cycle check. Last event: ${lastHeat.type} on ${lastHeat.date}.`,
            dueDate: dateUtils.addDays(lastHeat.date, nextHeatDue),
            animalId: animal.id,
            priority: daysSince >= nextHeatDue ? 'High' : 'Medium',
          });
        }
      }
    }

    // Upcoming Calving Alert
    if (expectedCalving) {
      const daysLeft = dateUtils.diffDays(expectedCalving, today);
      if (daysLeft <= settings.closeupDays && daysLeft > -30) { // Keep alert active for 30 days past due if not logged
        alerts.push({
          id: `alert-calving-${animal.id}`,
          type: 'Repro',
          title: daysLeft < 0 ? 'Calving OVERDUE' : 'Upcoming Calving',
          description: daysLeft < 0 ? `${animal.tag} is overdue for calving by ${Math.abs(daysLeft)} days.` : `${animal.tag} is in closeup. Expected calving in ${daysLeft} days.`,
          dueDate: expectedCalving,
          animalId: animal.id,
          priority: 'High'
        });
      }
    }

    // Health Treatment Reminders
    const animalHealth = healthEvents
      .filter(e => e.animalId === animal.id && e.treatmentDays)
      .sort((a, b) => b.date.localeCompare(a.date));
    
    animalHealth.forEach(event => {
      if (!event.treatmentDays) return;
      const endDate = dateUtils.addDays(event.date, event.treatmentDays);
      const daysInto = dateUtils.diffDays(today, event.date);
      const daysLeft = dateUtils.diffDays(endDate, today);
      if (daysInto >= 0 && daysLeft >= -7) { // keep alert for 7 days if missed
        alerts.push({
          id: `health-treat-${event.id}-${today}`,
          type: 'Health',
          title: daysLeft < 0 ? 'Treatment Missed/Overdue' : 'Treatment Reminder',
          description: `${animal.tag}: Day ${daysInto + 1}/${event.treatmentDays} — ${event.medication || event.details} (${daysLeft < 0 ? 'Overdue' : `${daysLeft} days remaining`})`,
          dueDate: endDate,
          animalId: animal.id,
          priority: daysLeft <= 0 ? 'High' : 'Medium'
        });
      }
    });
  });

  // Convert grouped protocol alerts to actual alert objects
  Object.entries(protocolAlertMap).forEach(([key, data]) => {
    const { animals: animalTags, stepDate, daysUntil, stepAction, stepDay, templateName, stepTime } = data;
    const countLabel = animalTags.length === 1 ? animalTags[0] : `${animalTags.length} Cows`;
    alerts.push({
      id: `protocol-grouped-${key}`,
      type: 'Protocol',
      title: daysUntil < 0 ? `Protocol Step OVERDUE` : daysUntil === 0 ? 'Protocol Step Due TODAY' : `Protocol Step in ${daysUntil} Day${daysUntil > 1 ? 's' : ''}`,
      description: `${countLabel} — ${stepAction} (Day ${stepDay} of "${templateName}")${stepTime ? ` @ ${stepTime}` : ''}${animalTags.length > 1 ? `. Tags: ${animalTags.slice(0,5).join(', ')}${animalTags.length > 5 ? ` +${animalTags.length - 5} more` : ''}` : ''}`,
      dueDate: stepDate,
      priority: daysUntil <= 0 ? 'High' : 'Medium'
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
      if (currentStatus !== AnimalStatus.ACTIVE) {
         throw new Error(`Cannot Inseminate: Cow is currently ${currentStatus}. Current status must be Active/Heat. Correct flow: Heat → Insemination → Pregnancy Check → Calving.`);
      }
    }
    if (event.type === ReproEventType.PREGNANCY_CHECK) {
      if (currentStatus !== AnimalStatus.INSEMINATED && currentStatus !== AnimalStatus.PREGNANT && currentStatus !== AnimalStatus.ACTIVE) {
        throw new Error(`Pregnancy check requires cow to be Inseminated first. Current status: ${currentStatus}.`);
      }
    }
    if (event.type === ReproEventType.CALVING) {
      if (![AnimalStatus.PREGNANT, AnimalStatus.CLOSEUP].includes(currentStatus)) {
        throw new Error(`Calving requires cow to be Pregnant or in Closeup. Current status: ${currentStatus}.`);
      }
    }
    if (event.type === ReproEventType.DRY_OFF) {
      if (currentStatus !== AnimalStatus.PREGNANT) {
        throw new Error(`Dry Off requires cow to be Pregnant. Current status: ${currentStatus}.`);
      }
    }
    if (event.date && !dateUtils.isTodayOrPast(event.date)) {
      throw new Error('Events cannot be recorded in the future.');
    }
  }
};
