import {
  Animal,
  ReproductionEvent,
  ReproEventType,
  AnimalStatus,
  FarmSettings
} from '../types';
import { normalizeTechnicianName, normalizeSemenName, dateUtils } from './businessLogic';

export interface AIServiceRecord {
  id: string;
  animalId: string;
  animalTag: string;
  date: string;
  semenName: string;
  technician: string;
  cycleNumber: number; // 1 = 1st service, 2 = 2nd service, etc.
  outcome: 'Pregnant' | 'Non-Pregnant' | 'Pending';
  pdDate?: string;
  daysToNextService?: number;
}

export interface RepeatBreederSummary {
  animal: Animal;
  aiCount: number;
  lastAIDate: string;
  firstAIDate: string;
  daysOpenSinceFirstAI: number;
  lastSemen: string;
  lastTechnician: string;
  servicesHistory: AIServiceRecord[];
  severity: 'Warning' | 'Critical';
  recommendations: string[];
}

export interface SemenPerformanceRecord {
  semenName: string;
  totalAI: number;
  confirmedPregnant: number;
  confirmedOpen: number;
  pendingPD: number;
  conceptionRate: number; // Percentage 0-100
  recentAnimals: { tag: string; date: string; outcome: string }[];
}

export interface TechnicianPerformanceRecord {
  technician: string;
  totalAI: number;
  confirmedPregnant: number;
  confirmedOpen: number;
  pendingPD: number;
  conceptionRate: number; // Percentage 0-100
  benchmark: 'Excellent' | 'Good' | 'Needs Review';
}

export interface FertilityAnalyticsReport {
  overallConceptionRate: number;
  firstServiceConceptionRate: number;
  servicesPerConception: number;
  totalInseminations: number;
  totalEvaluatedAI: number;
  totalConfirmedPregnant: number;
  totalConfirmedOpen: number;
  repeatBreeders: RepeatBreederSummary[];
  repeatBreederCount: number;
  repeatBreederPercentage: number;
  semenPerformance: SemenPerformanceRecord[];
  technicianPerformance: TechnicianPerformanceRecord[];
  monthlyConceptionTrend: { month: string; totalAI: number; pregnant: number; cr: number }[];
}

/**
 * Calculates comprehensive fertility analytics, repeat breeder alerts, and semen/technician performance rankings.
 */
export function calculateFertilityAnalytics(
  animals: Animal[],
  reproEvents: ReproductionEvent[],
  settings?: FarmSettings
): FertilityAnalyticsReport {
  const techniciansList = settings?.technicians || [];
  const semenCatalogList = settings?.semenCatalog || [];

  // Group events by animal
  const eventsByAnimal = new Map<string, ReproductionEvent[]>();
  reproEvents.forEach(e => {
    const list = eventsByAnimal.get(e.animalId) || [];
    list.push(e);
    eventsByAnimal.set(e.animalId, list);
  });

  // Sort events chronologically for each animal
  eventsByAnimal.forEach(list => {
    list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  });

  const allEvaluatedServices: AIServiceRecord[] = [];
  const repeatBreeders: RepeatBreederSummary[] = [];

  // 1. Process each animal to evaluate AI cycles and Repeat Breeders
  animals.forEach(animal => {
    const events = eventsByAnimal.get(animal.id) || [];
    if (events.length === 0) return;

    // Find the latest calving date (start of current cycle)
    const calvings = events.filter(e => e.type === ReproEventType.CALVING);
    const lastCalvingDate = calvings.length > 0 ? calvings[calvings.length - 1].date : null;

    // Inseminations in current cycle (after last calving, or all if never calved)
    const cycleAI = events.filter(e => {
      if (e.type !== ReproEventType.INSEMINATION) return false;
      if (lastCalvingDate && e.date < lastCalvingDate) return false;
      return true;
    });

    const isPregnant = animal.status === AnimalStatus.PREGNANT;

    // Evaluate each AI service outcome
    const animalServiceRecords: AIServiceRecord[] = [];

    cycleAI.forEach((aiEvent, idx) => {
      const nextEvent = events.find(
        e => (e.date > aiEvent.date || (e.date === aiEvent.date && e.id !== aiEvent.id)) &&
             (e.type === ReproEventType.INSEMINATION ||
              e.type === ReproEventType.PREGNANCY_CHECK ||
              e.type === ReproEventType.CALVING ||
              e.type === ReproEventType.ABORTION)
      );

      let outcome: 'Pregnant' | 'Non-Pregnant' | 'Pending' = 'Pending';
      let pdDate: string | undefined = undefined;

      if (aiEvent.pregnancyResult === 'Pregnant') {
        outcome = 'Pregnant';
      } else if (aiEvent.pregnancyResult === 'Non-Pregnant') {
        outcome = 'Non-Pregnant';
      } else if (nextEvent) {
        if (nextEvent.type === ReproEventType.PREGNANCY_CHECK) {
          outcome = nextEvent.pregnancyResult === 'Pregnant' ? 'Pregnant' : 'Non-Pregnant';
          pdDate = nextEvent.date;
        } else if (nextEvent.type === ReproEventType.INSEMINATION) {
          outcome = 'Non-Pregnant'; // Cow returned to heat and was re-inseminated
        } else if (nextEvent.type === ReproEventType.CALVING) {
          outcome = 'Pregnant';
        } else if (nextEvent.type === ReproEventType.ABORTION) {
          outcome = 'Pregnant'; // Had conceived then aborted
        }
      } else if (isPregnant && idx === cycleAI.length - 1) {
        outcome = 'Pregnant';
      } else {
        const daysAgo = dateUtils.diffDays(aiEvent.date, dateUtils.today());
        if (daysAgo > (settings?.pregnancyCheckDays || 35) + 30) {
          // Over 65 days without PD and not pregnant -> likely open/failed
          outcome = 'Non-Pregnant';
        }
      }

      const rawSemen = aiEvent.semenName || aiEvent.bullId || 'Unspecified Semen';
      const cleanSemen = normalizeSemenName(rawSemen, semenCatalogList);
      const rawTech = aiEvent.technician || 'Unassigned Tech';
      const cleanTech = normalizeTechnicianName(rawTech, techniciansList);

      const record: AIServiceRecord = {
        id: aiEvent.id,
        animalId: animal.id,
        animalTag: animal.tag,
        date: aiEvent.date,
        semenName: cleanSemen,
        technician: cleanTech,
        cycleNumber: idx + 1,
        outcome,
        pdDate
      };

      animalServiceRecords.push(record);
      allEvaluatedServices.push(record);
    });

    // Repeat Breeder Check: 3+ inseminations in current cycle and not currently pregnant
    if (cycleAI.length >= 3 && !isPregnant && animal.status !== AnimalStatus.DRY) {
      const firstAI = cycleAI[0];
      const lastAI = cycleAI[cycleAI.length - 1];
      const daysOpenSinceFirstAI = dateUtils.diffDays(firstAI.date, dateUtils.today());

      const recs: string[] = [];
      if (cycleAI.length === 3) {
        recs.push('Inspect for subclinical endometritis (uterine flush / wash).');
        recs.push('Perform thorough ovarian & reproductive tract ultrasound.');
        recs.push('Consider GnRH (Buserelin 2.5ml) at the exact time of next AI.');
      } else if (cycleAI.length === 4) {
        recs.push('Double insemination protocol (12h & 24h post-estrus onset).');
        recs.push('Switch to high-fertility proven bull semen with alternate technician.');
        recs.push('Post-insemination PRID/CIDR progesterone supplementation.');
      } else {
        recs.push('Critical chronic repeat breeder: Evaluate body condition score & nutrition.');
        recs.push('Comprehensive veterinary ultrasound for follicular cysts or hydrosalpinx.');
        recs.push('Review economic viability for culling if non-responsive to therapy.');
      }

      repeatBreeders.push({
        animal,
        aiCount: cycleAI.length,
        lastAIDate: lastAI.date,
        firstAIDate: firstAI.date,
        daysOpenSinceFirstAI,
        lastSemen: normalizeSemenName(lastAI.semenName || lastAI.bullId || '', semenCatalogList),
        lastTechnician: normalizeTechnicianName(lastAI.technician || '', techniciansList),
        servicesHistory: animalServiceRecords,
        severity: cycleAI.length >= 4 ? 'Critical' : 'Warning',
        recommendations: recs
      });
    }
  });

  // Sort repeat breeders: Critical (4+ AI) first, then highest AI count
  repeatBreeders.sort((a, b) => b.aiCount - a.aiCount);

  // 2. Semen Performance Breakdown
  const semenMap = new Map<string, { total: number; preg: number; open: number; pending: number; animals: any[] }>();

  allEvaluatedServices.forEach(s => {
    const sName = s.semenName || 'Unspecified Semen';
    const entry = semenMap.get(sName) || { total: 0, preg: 0, open: 0, pending: 0, animals: [] };
    entry.total += 1;
    if (s.outcome === 'Pregnant') entry.preg += 1;
    else if (s.outcome === 'Non-Pregnant') entry.open += 1;
    else entry.pending += 1;

    entry.animals.push({ tag: s.animalTag, date: s.date, outcome: s.outcome });
    semenMap.set(sName, entry);
  });

  const semenPerformance: SemenPerformanceRecord[] = Array.from(semenMap.entries()).map(([name, data]) => {
    const evaluated = data.preg + data.open;
    const cr = evaluated > 0 ? Math.round((data.preg / evaluated) * 100) : 0;
    return {
      semenName: name,
      totalAI: data.total,
      confirmedPregnant: data.preg,
      confirmedOpen: data.open,
      pendingPD: data.pending,
      conceptionRate: cr,
      recentAnimals: data.animals.slice(-6).reverse()
    };
  }).sort((a, b) => {
    // Sort by conception rate (descending) with at least 2 services, otherwise by total AI
    if (b.confirmedPregnant + b.confirmedOpen > 0 && a.confirmedPregnant + a.confirmedOpen > 0) {
      return b.conceptionRate - a.conceptionRate;
    }
    return b.totalAI - a.totalAI;
  });

  // 3. Technician Performance Breakdown
  const techMap = new Map<string, { total: number; preg: number; open: number; pending: number }>();

  allEvaluatedServices.forEach(s => {
    const tName = s.technician || 'Unassigned Tech';
    const entry = techMap.get(tName) || { total: 0, preg: 0, open: 0, pending: 0 };
    entry.total += 1;
    if (s.outcome === 'Pregnant') entry.preg += 1;
    else if (s.outcome === 'Non-Pregnant') entry.open += 1;
    else entry.pending += 1;
    techMap.set(tName, entry);
  });

  const technicianPerformance: TechnicianPerformanceRecord[] = Array.from(techMap.entries()).map(([name, data]) => {
    const evaluated = data.preg + data.open;
    const cr = evaluated > 0 ? Math.round((data.preg / evaluated) * 100) : 0;
    let benchmark: 'Excellent' | 'Good' | 'Needs Review' = 'Good';
    if (cr >= 60 && evaluated >= 3) benchmark = 'Excellent';
    else if (cr < 45 && evaluated >= 3) benchmark = 'Needs Review';

    return {
      technician: name,
      totalAI: data.total,
      confirmedPregnant: data.preg,
      confirmedOpen: data.open,
      pendingPD: data.pending,
      conceptionRate: cr,
      benchmark
    };
  }).sort((a, b) => b.totalAI - a.totalAI);

  // 4. Overall Herd Metrics
  const totalInseminations = allEvaluatedServices.length;
  const totalConfirmedPregnant = allEvaluatedServices.filter(s => s.outcome === 'Pregnant').length;
  const totalConfirmedOpen = allEvaluatedServices.filter(s => s.outcome === 'Non-Pregnant').length;
  const totalEvaluatedAI = totalConfirmedPregnant + totalConfirmedOpen;
  const overallConceptionRate = totalEvaluatedAI > 0
    ? Math.round((totalConfirmedPregnant / totalEvaluatedAI) * 100)
    : 0;

  // First Service Conception Rate (cycleNumber === 1)
  const firstServices = allEvaluatedServices.filter(s => s.cycleNumber === 1);
  const firstPreg = firstServices.filter(s => s.outcome === 'Pregnant').length;
  const firstOpen = firstServices.filter(s => s.outcome === 'Non-Pregnant').length;
  const firstEvaluated = firstPreg + firstOpen;
  const firstServiceConceptionRate = firstEvaluated > 0
    ? Math.round((firstPreg / firstEvaluated) * 100)
    : 0;

  // Services per Conception: Total Evaluated AI / Total Confirmed Pregnancies
  const servicesPerConception = totalConfirmedPregnant > 0
    ? parseFloat((totalEvaluatedAI / totalConfirmedPregnant).toFixed(2))
    : 0;

  // Breeding eligible animals (Adult females not calves/bulls)
  const eligibleBreedingFemales = animals.filter(a => a.sex === 'Female' && !a.isCalf && a.herd !== 'Young Stock Heifers');
  const repeatBreederPercentage = eligibleBreedingFemales.length > 0
    ? Math.round((repeatBreeders.length / eligibleBreedingFemales.length) * 100)
    : 0;

  // 5. Monthly Conception Trend (last 6 months)
  const monthlyData = new Map<string, { total: number; preg: number; evaluated: number }>();
  allEvaluatedServices.forEach(s => {
    if (!s.date) return;
    const monthKey = s.date.substring(0, 7); // 'YYYY-MM'
    const entry = monthlyData.get(monthKey) || { total: 0, preg: 0, evaluated: 0 };
    entry.total += 1;
    if (s.outcome === 'Pregnant') {
      entry.preg += 1;
      entry.evaluated += 1;
    } else if (s.outcome === 'Non-Pregnant') {
      entry.evaluated += 1;
    }
    monthlyData.set(monthKey, entry);
  });

  const monthlyConceptionTrend = Array.from(monthlyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, d]) => ({
      month,
      totalAI: d.total,
      pregnant: d.preg,
      cr: d.evaluated > 0 ? Math.round((d.preg / d.evaluated) * 100) : 0
    }));

  return {
    overallConceptionRate,
    firstServiceConceptionRate,
    servicesPerConception,
    totalInseminations,
    totalEvaluatedAI,
    totalConfirmedPregnant,
    totalConfirmedOpen,
    repeatBreeders,
    repeatBreederCount: repeatBreeders.length,
    repeatBreederPercentage,
    semenPerformance,
    technicianPerformance,
    monthlyConceptionTrend
  };
}
