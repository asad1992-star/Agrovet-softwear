import {
  Animal,
  ReproductionEvent,
  HealthEvent,
  ProtocolEnrollment,
  ProtocolTemplate,
  FarmSettings,
  ReproEventType,
  AnimalStatus
} from '../types';
import { dateUtils } from './businessLogic';

export interface DailyTreatmentTask {
  id: string;
  healthEventId: string;
  animalId: string;
  animalTag: string;
  animalBreed: string;
  animalHerd: string;
  medication: string;
  dosage: string;
  treatments: { name: string; dose: string }[];
  dayProgress: string; // e.g. "Day 2 of 5"
  dayNumber: number;
  totalDays: number;
  isCompletedToday: boolean;
  status: 'Pending' | 'Administered';
  clinicalSymptoms?: string;
}

export interface DailyPdTask {
  animalId: string;
  animalTag: string;
  animalBreed: string;
  animalHerd: string;
  daysPostAI: number;
  serviceDate: string;
  semenName: string;
  technician: string;
  status: 'Due Today' | 'Overdue';
}

export interface DailyCalvingDryOffTask {
  animalId: string;
  animalTag: string;
  animalBreed: string;
  animalHerd: string;
  type: 'Expected Calving' | 'Due for Dry-Off' | 'Closeup Pen Move';
  targetDate: string;
  daysRemainingOrOver: number;
  pregnancyDays?: number;
  urgency: 'Immediate' | 'Upcoming';
}

export interface DailyHeatWatchTask {
  animalId: string;
  animalTag: string;
  animalBreed: string;
  animalHerd: string;
  daysPostAI: number;
  lastAIDate: string;
  semenName: string;
  reason: string; // e.g. "Cycle Day 21 (Estrus Window)"
}

export interface DailyProtocolTask {
  enrollmentId: string;
  templateName: string;
  stepIndex: number;
  action: string;
  time?: string;
  animalTags: string[];
  animalCount: number;
}

export interface DailyActionSheet {
  date: string;
  farmName: string;
  treatments: DailyTreatmentTask[];
  pdChecks: DailyPdTask[];
  calvingAndDryOff: DailyCalvingDryOffTask[];
  heatWatch: DailyHeatWatchTask[];
  protocols: DailyProtocolTask[];
  totalTasksCount: number;
  completedTasksCount: number;
}

/**
 * Gathers and compiles all actions, health treatments, repro milestones, and protocol tasks due today.
 */
export function generateDailyActionSheet(
  animals: Animal[],
  reproEvents: ReproductionEvent[],
  healthEvents: HealthEvent[],
  enrollments: ProtocolEnrollment[] = [],
  protocolTemplates: ProtocolTemplate[] = [],
  settings?: FarmSettings,
  targetDate: string = dateUtils.today()
): DailyActionSheet {
  const farmName = settings?.farmName || 'AgroVet Farm';
  const pdCheckDays = settings?.pregnancyCheckDays || 35;
  const dryPeriodDays = settings?.dryPeriodDays || 60;
  const closeupDays = settings?.closeupDays || 21;

  // 1. Health Treatments Due Today
  const treatments: DailyTreatmentTask[] = [];
  healthEvents.forEach(h => {
    if (h.cureStatus === 'Cured') return;
    const animal = animals.find(a => a.id === h.animalId);
    if (!animal) return;

    const startDate = h.date;
    const totalDays = h.treatmentDays || (h.numberOfDoses && h.daysGap ? (h.numberOfDoses - 1) * h.daysGap + 1 : 1);
    
    // Check if targetDate falls within treatment span
    const dayDiff = dateUtils.diffDays(startDate, targetDate);
    if (dayDiff >= 0 && dayDiff < totalDays) {
      let isScheduledForToday = true;

      // Multi-dose gap check
      if (h.daysGap && h.daysGap > 1) {
        if (dayDiff % h.daysGap !== 0) {
          isScheduledForToday = false;
        }
      }

      if (isScheduledForToday) {
        const dosesAdministered = h.dosesAdministered || [];
        const isDoneToday = dosesAdministered.includes(targetDate);
        const dayNumber = dayDiff + 1;

        const medicationName = h.treatments && h.treatments.length > 0
          ? h.treatments.map(t => `${t.name} (${t.dose})`).join(', ')
          : (h.medication ? `${h.medication} ${h.dosage || ''}` : 'Prescribed Treatment');

        treatments.push({
          id: `${h.id}-${targetDate}`,
          healthEventId: h.id,
          animalId: animal.id,
          animalTag: animal.tag,
          animalBreed: animal.breed || 'Cattle',
          animalHerd: animal.herd || 'General Pen',
          medication: medicationName,
          dosage: h.dosage || '',
          treatments: h.treatments || (h.medication ? [{ name: h.medication, dose: h.dosage || '' }] : []),
          dayProgress: `Day ${dayNumber} of ${totalDays}`,
          dayNumber,
          totalDays,
          isCompletedToday: isDoneToday,
          status: isDoneToday ? 'Administered' : 'Pending',
          clinicalSymptoms: h.details
        });
      }
    }
  });

  // 2. PD Checks Due Today / Overdue
  const pdChecks: DailyPdTask[] = [];
  animals.forEach(animal => {
    if (animal.status === AnimalStatus.INSEMINATED) {
      // Find latest insemination
      const aiEvents = reproEvents.filter(
        e => e.animalId === animal.id && e.type === ReproEventType.INSEMINATION
      ).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      const lastAI = aiEvents[0];
      if (lastAI) {
        const daysPostAI = dateUtils.diffDays(lastAI.date, targetDate);
        if (daysPostAI >= pdCheckDays) {
          pdChecks.push({
            animalId: animal.id,
            animalTag: animal.tag,
            animalBreed: animal.breed || 'Cattle',
            animalHerd: animal.herd || 'Lactating Pen',
            daysPostAI,
            serviceDate: lastAI.date,
            semenName: lastAI.semenName || lastAI.bullId || 'Unspecified Semen',
            technician: lastAI.technician || 'Unassigned',
            status: daysPostAI > pdCheckDays + 7 ? 'Overdue' : 'Due Today'
          });
        }
      }
    }
  });

  // 3. Calving & Dry-Off Due
  const calvingAndDryOff: DailyCalvingDryOffTask[] = [];
  animals.forEach(animal => {
    if (animal.status === AnimalStatus.PREGNANT || animal.status === AnimalStatus.CLOSEUP || animal.status === AnimalStatus.DRY) {
      // Calving checks
      if (animal.expectedCalving) {
        const daysToCalving = dateUtils.diffDays(targetDate, animal.expectedCalving);
        if (daysToCalving <= 5 && daysToCalving >= -7) {
          calvingAndDryOff.push({
            animalId: animal.id,
            animalTag: animal.tag,
            animalBreed: animal.breed || 'Cattle',
            animalHerd: animal.herd || 'Closeup Pen',
            type: 'Expected Calving',
            targetDate: animal.expectedCalving,
            daysRemainingOrOver: daysToCalving,
            pregnancyDays: animal.pregnancyDays,
            urgency: daysToCalving <= 0 ? 'Immediate' : 'Upcoming'
          });
        } else if (daysToCalving > 5 && daysToCalving <= closeupDays && animal.status === AnimalStatus.PREGNANT && animal.herd !== 'Closeup Pen') {
          calvingAndDryOff.push({
            animalId: animal.id,
            animalTag: animal.tag,
            animalBreed: animal.breed || 'Cattle',
            animalHerd: animal.herd || 'Lactating Pen',
            type: 'Closeup Pen Move',
            targetDate: animal.expectedCalving,
            daysRemainingOrOver: daysToCalving,
            pregnancyDays: animal.pregnancyDays,
            urgency: 'Upcoming'
          });
        }

        // Dry off checks (for lactating pregnant cows)
        if (animal.status === AnimalStatus.PREGNANT && daysToCalving <= dryPeriodDays && daysToCalving > closeupDays) {
          calvingAndDryOff.push({
            animalId: animal.id,
            animalTag: animal.tag,
            animalBreed: animal.breed || 'Cattle',
            animalHerd: animal.herd || 'Lactating Pen',
            type: 'Due for Dry-Off',
            targetDate: animal.expectedCalving,
            daysRemainingOrOver: daysToCalving,
            pregnancyDays: animal.pregnancyDays,
            urgency: daysToCalving <= dryPeriodDays - 5 ? 'Immediate' : 'Upcoming'
          });
        }
      }
    }
  });

  // 4. Heat Watch List (Cows 18-24 days post-AI)
  const heatWatch: DailyHeatWatchTask[] = [];
  animals.forEach(animal => {
    if (animal.status === AnimalStatus.INSEMINATED) {
      const aiEvents = reproEvents.filter(
        e => e.animalId === animal.id && e.type === ReproEventType.INSEMINATION
      ).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      const lastAI = aiEvents[0];
      if (lastAI) {
        const daysPostAI = dateUtils.diffDays(lastAI.date, targetDate);
        if (daysPostAI >= 18 && daysPostAI <= 24) {
          heatWatch.push({
            animalId: animal.id,
            animalTag: animal.tag,
            animalBreed: animal.breed || 'Cattle',
            animalHerd: animal.herd || 'General Pen',
            daysPostAI,
            lastAIDate: lastAI.date,
            semenName: lastAI.semenName || lastAI.bullId || 'Unspecified Semen',
            reason: `Day ${daysPostAI} Post-AI (Estrus Repeat Window)`
          });
        }
      }
    }
  });

  // 5. Active Protocol Steps Due Today
  const protocols: DailyProtocolTask[] = [];
  enrollments.forEach(en => {
    if (en.status !== 'Active') return;
    const template = protocolTemplates.find(t => t.id === en.templateId);
    if (!template) return;

    template.steps.forEach((step, idx) => {
      if (en.completedStepIndices?.includes(idx)) return;
      const stepDate = dateUtils.addDays(en.startDate, step.dayOffset);
      if (stepDate === targetDate) {
        const enrolledAnimals = animals.filter(a => en.animalIds?.includes(a.id));
        protocols.push({
          enrollmentId: en.id,
          templateName: template.name,
          stepIndex: idx,
          action: step.action,
          time: step.time,
          animalTags: enrolledAnimals.map(a => a.tag),
          animalCount: enrolledAnimals.length
        });
      }
    });
  });

  // Total tasks & completed
  const totalTasksCount = treatments.length + pdChecks.length + calvingAndDryOff.length + heatWatch.length + protocols.length;
  const completedTasksCount = treatments.filter(t => t.isCompletedToday).length;

  return {
    date: targetDate,
    farmName,
    treatments,
    pdChecks,
    calvingAndDryOff,
    heatWatch,
    protocols,
    totalTasksCount,
    completedTasksCount
  };
}

/**
 * Generates an ultra-clean, emoji-formatted WhatsApp message ready to be shared with farm staff or supervisors.
 */
export function formatActionSheetForWhatsApp(sheet: DailyActionSheet): string {
  const lines: string[] = [];
  lines.push(`📋 *${sheet.farmName.toUpperCase()} - DAILY FARM WORKLIST*`);
  lines.push(`📅 *Date:* ${sheet.date}`);
  lines.push(`📊 *Total Tasks:* ${sheet.totalTasksCount} items`);
  lines.push(`────────────────────────`);

  // 1. Injections / Treatments
  if (sheet.treatments.length > 0) {
    lines.push(`\n💉 *INJECTIONS & TREATMENTS DUE TODAY (${sheet.treatments.length})*`);
    sheet.treatments.forEach((t, i) => {
      const statusIcon = t.isCompletedToday ? '✅' : '⏳';
      lines.push(`${i + 1}. ${statusIcon} *Cow ${t.animalTag}* (${t.animalHerd})`);
      lines.push(`   💊 ${t.medication}`);
      lines.push(`   📊 Progress: ${t.dayProgress}`);
      if (t.clinicalSymptoms) lines.push(`   📝 Note: ${t.clinicalSymptoms}`);
    });
  } else {
    lines.push(`\n💉 *INJECTIONS DUE TODAY:* None scheduled 👍`);
  }

  // 2. PD Checks
  if (sheet.pdChecks.length > 0) {
    lines.push(`\n🔍 *PREGNANCY CHECKS DUE TODAY (${sheet.pdChecks.length})*`);
    sheet.pdChecks.forEach((p, i) => {
      const alertTag = p.status === 'Overdue' ? '⚠️ OVERDUE' : '📌 DUE';
      lines.push(`${i + 1}. ${alertTag} *Cow ${p.animalTag}* (${p.animalHerd})`);
      lines.push(`   ⏱️ ${p.daysPostAI} days post-AI | Semen: ${p.semenName}`);
      lines.push(`   👨‍⚕️ Tech: ${p.technician}`);
    });
  }

  // 3. Calving & Dry-Off
  if (sheet.calvingAndDryOff.length > 0) {
    lines.push(`\n🐄 *CALVING & DRY-OFF ACTIONS (${sheet.calvingAndDryOff.length})*`);
    sheet.calvingAndDryOff.forEach((c, i) => {
      const icon = c.type === 'Expected Calving' ? '🍼' : '📦';
      const daysText = c.daysRemainingOrOver <= 0
        ? `*Due Today / Passed by ${Math.abs(c.daysRemainingOrOver)}d*`
        : `Due in ${c.daysRemainingOrOver} days (${c.targetDate})`;
      lines.push(`${i + 1}. ${icon} *Cow ${c.animalTag}* - ${c.type}`);
      lines.push(`   📍 Pen: ${c.animalHerd} | ⏳ ${daysText}`);
    });
  }

  // 4. Heat Watch
  if (sheet.heatWatch.length > 0) {
    lines.push(`\n👁️ *HEAT WATCH DUE TODAY (${sheet.heatWatch.length})*`);
    sheet.heatWatch.forEach((h, i) => {
      lines.push(`${i + 1}. 🎯 *Cow ${h.animalTag}* (${h.animalHerd}) - ${h.reason}`);
    });
  }

  // 5. Protocols
  if (sheet.protocols.length > 0) {
    lines.push(`\n🧪 *PROTOCOL INJECTIONS TODAY (${sheet.protocols.length})*`);
    sheet.protocols.forEach((pr, i) => {
      lines.push(`${i + 1}. 🧬 *${pr.templateName}*: ${pr.action} ${pr.time ? `(${pr.time})` : ''}`);
      lines.push(`   👥 Cows (${pr.animalCount}): ${pr.animalTags.join(', ')}`);
    });
  }

  lines.push(`\n────────────────────────`);
  lines.push(`_Generated automatically by AgroVet Pro_`);

  return lines.join('\n');
}
